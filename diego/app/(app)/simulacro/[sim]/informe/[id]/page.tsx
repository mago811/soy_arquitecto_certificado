import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSim, questionById, objectiveTitle } from "@/lib/content";
import { simAttempt, scoreSim } from "@/lib/progress";
import { Md } from "@/components/Md";

const L = ["A", "B", "C", "D"];

export default async function Informe({ params }: { params: Promise<{ sim: string; id: string }> }) {
  const p = await params;
  const a = await simAttempt(Number(p.id));
  if (!a || a.sim_id !== Number(p.sim)) notFound();
  if (!a.finished_at) redirect(`/simulacro/${a.sim_id}/intento/${a.id}`);
  const sim = getSim(a.sim_id)!;
  const s = scoreSim(sim.questions, a.answers);
  const pass = s.scaled >= 720;
  const wrong = sim.questions.filter((id) => a.answers[id] !== questionById(id)!.correct);

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Informe · Simulacro {a.sim_id}</p>
      <div className="card mt-3 p-5 text-center">
        <p className="text-sm text-muted">Puntaje estimado</p>
        <p className={`text-5xl font-bold ${pass ? "text-ok" : "text-bad"}`}>{s.scaled}</p>
        <p className="mt-1 text-muted">{s.correct}/{s.total} correctas ({s.pct}%) · se aprueba con 720</p>
        <p className="mt-3 rounded-lg bg-warn-soft p-2 text-xs text-warn">
          Es una estimación lineal (100 + 900 × % de aciertos). No es el puntaje oficial: Anthropic usa una escala propia que no publica.
        </p>
      </div>

      <h2 className="mt-8 font-bold">Por dominio</h2>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {s.perDomain.map((d) => (
            <tr key={d.domain.id} className="border-b border-line">
              <td className="py-2">{d.domain.name} <span className="text-muted">({d.domain.weight}%)</span></td>
              <td className="py-2 text-right text-muted">{d.ok}/{d.n}</td>
              <td className={`w-14 py-2 text-right font-bold ${d.pct == null ? "" : d.pct >= 70 ? "text-ok" : "text-bad"}`}>{d.pct ?? "–"}{d.pct != null && "%"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-8 font-bold">Por objetivo (formato score report)</h2>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {s.perObjective.map((o) => (
            <tr key={o.objective.id} className="border-b border-line align-top">
              <td className="w-8 py-2 font-bold text-muted">{o.objective.id}</td>
              <td className="py-2">{objectiveTitle(o.objective)}</td>
              <td className={`w-14 py-2 text-right font-bold ${o.pct >= 70 ? "text-ok" : o.pct >= 50 ? "text-warn" : "text-bad"}`}>{o.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-8 font-bold">Las que fallaste ({wrong.length})</h2>
      <p className="text-sm text-muted">Ya quedaron en el registro de errores y vuelven en el repaso espaciado.</p>
      <ul className="mt-3 flex flex-col gap-3">
        {wrong.map((id) => {
          const q = questionById(id)!;
          const ch = a.answers[id];
          return (
            <li key={id} className="card p-4 text-sm">
              <p className="text-xs text-muted">Objetivo {q.objective}</p>
              <p className="mt-1 whitespace-pre-line"><Md text={q.scenario} /></p>
              <p className="mt-2 text-bad">Elegiste: {ch === undefined ? "sin responder" : <>{L[ch]}. <Md text={q.options[ch]} /></>}</p>
              <p className="text-ok">Correcta: {L[q.correct]}. <Md text={q.options[q.correct]} /></p>
              <p className="mt-2"><Md text={q.why_correct} /></p>
              {ch !== undefined && q.why_wrong[String(ch)] && <p className="mt-1 text-muted">Por qué la tuya no: <Md text={q.why_wrong[String(ch)]} /></p>}
              <p className="mt-2 font-semibold">Regla: <Md text={q.rule} /></p>
              <a href={q.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-accent underline">Fuente</a>
            </li>
          );
        })}
      </ul>
      <div className="mt-6"><Link href="/progreso" className="btn">Ver progreso</Link></div>
    </div>
  );
}
