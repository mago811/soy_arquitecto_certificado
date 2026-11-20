import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { questionById, objectiveTitle } from "@/lib/content";
import { scoreSim } from "@/lib/progress";
import { diagAttempt, objectiveFirstDay, STATUS_LABEL, type DayStatus } from "@/lib/diag";

const L = ["A", "B", "C", "D"];

export default async function DiagInforme({ params }: { params: Promise<{ id: string }> }) {
  const a = await diagAttempt(Number((await params).id));
  if (!a) notFound();
  if (!a.finished_at) redirect(`/diagnostico/${a.id}`);
  const s = scoreSim(a.questions, a.answers);
  const firstDay = objectiveFirstDay(a.upto_day);
  const statusOf = (obj: number): DayStatus => a.self_report[String(firstDay.get(obj))] ?? "no";
  const pass = s.scaled >= 720;
  const wrong = a.questions.filter((id) => a.answers[id] !== questionById(id)?.correct);

  // Lo estudiado (completo / a medias) vs. lo que marcó como no hecho.
  const split = { estudiado: { n: 0, ok: 0 }, no: { n: 0, ok: 0 } };
  for (const id of a.questions) {
    const q = questionById(id); if (!q) continue;
    const g = statusOf(q.objective) === "no" ? split.no : split.estudiado;
    g.n++; if (a.answers[id] === q.correct) g.ok++;
  }
  const pctOf = (g: { n: number; ok: number }) => (g.n ? Math.round((g.ok / g.n) * 100) : null);
  const flojos = s.perObjective.filter((o) => o.pct < 70);

  const resumen = [
    `Test de nivel CCAR-F · ${new Date(a.finished_at).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} · días 1-${a.upto_day}`,
    `Puntaje estimado: ${s.scaled} (${s.correct}/${s.total}, ${s.pct}%)`,
    `Lo que marqué como estudiado: ${pctOf(split.estudiado) ?? "–"}% · lo que no hice: ${pctOf(split.no) ?? "–"}%`,
    `Autoevaluación: ${Object.entries(a.self_report).map(([d, v]) => `D${d} ${STATUS_LABEL[v as DayStatus] ?? v}`).join(", ")}`,
    `Por dominio: ${s.perDomain.filter((d) => d.n).map((d) => `${d.domain.name} ${d.pct}%`).join(" · ")}`,
    `Flojos (<70%): ${flojos.length ? flojos.map((o) => `obj ${o.objective.id} (${o.ok}/${o.n})`).join(", ") : "ninguno"}`,
  ].join("\n");

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Informe · Test de nivel (días 1 a {a.upto_day})</p>
      <div className="card mt-3 p-5 text-center">
        <p className="text-sm text-muted">Puntaje estimado con lo visto hasta hoy</p>
        <p className={`text-5xl font-bold ${pass ? "text-ok" : "text-bad"}`}>{s.scaled}</p>
        <p className="mt-1 text-muted">{s.correct}/{s.total} correctas ({s.pct}%) · se aprueba con 720</p>
        <p className="mt-3 rounded-lg bg-warn-soft p-2 text-xs text-warn">
          Estimación lineal (100 + 900 × % de aciertos), solo sobre los objetivos que el plan ya dio. No es la escala oficial y el examen
          real también trae los objetivos que faltan.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div className="card p-3">
          <p className="text-xs text-muted">En lo que marcaste como estudiado</p>
          <p className="text-2xl font-bold">{pctOf(split.estudiado) ?? "–"}{split.estudiado.n ? "%" : ""}</p>
          <p className="text-xs text-muted">{split.estudiado.ok}/{split.estudiado.n}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">En lo que marcaste como no hecho</p>
          <p className="text-2xl font-bold">{pctOf(split.no) ?? "–"}{split.no.n ? "%" : ""}</p>
          <p className="text-xs text-muted">{split.no.ok}/{split.no.n}</p>
        </div>
      </div>

      <h2 className="mt-8 font-bold">Qué repasar primero</h2>
      {flojos.length === 0 ? <p className="text-sm text-muted">Ningún objetivo por debajo de 70%. Seguí con el plan.</p> : (
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {flojos.sort((x, y) => x.pct - y.pct).map((o) => (
            <li key={o.objective.id} className="card flex items-center justify-between gap-3 p-3">
              <span><span className="font-bold">Obj. {o.objective.id}</span> · {objectiveTitle(o.objective)}
                <span className="block text-xs text-muted">Día {firstDay.get(o.objective.id)} · {STATUS_LABEL[statusOf(o.objective.id)]} · {o.ok}/{o.n}</span></span>
              <span className="flex shrink-0 gap-2">
                <Link href={`/leccion/${o.objective.id}`} className="text-accent underline">Lección</Link>
                <Link href={`/practica?obj=${o.objective.id}`} className="text-accent underline">Práctica</Link>
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-bold">Por dominio</h2>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {s.perDomain.filter((d) => d.n).map((d) => (
            <tr key={d.domain.id} className="border-b border-line">
              <td className="py-2">{d.domain.name} <span className="text-muted">({d.domain.weight}%)</span></td>
              <td className="py-2 text-right text-muted">{d.ok}/{d.n}</td>
              <td className={`w-14 py-2 text-right font-bold ${(d.pct ?? 0) >= 70 ? "text-ok" : "text-bad"}`}>{d.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-8 font-bold">Mandale esto a tu coach</h2>
      <p className="text-sm text-muted">Copialo y pasáselo: con esto sabemos qué testear y qué reforzar.</p>
      <textarea readOnly value={resumen} rows={7} className="card mt-2 w-full p-3 font-mono text-xs" />

      <h2 className="mt-8 font-bold">Las que fallaste ({wrong.length})</h2>
      <p className="text-sm text-muted">Las que respondiste mal vuelven mañana en el repaso espaciado.</p>
      <ul className="mt-3 flex flex-col gap-3">
        {wrong.map((id) => {
          const q = questionById(id); if (!q) return null;
          const ch = a.answers[id];
          return (
            <li key={id} className="card p-4 text-sm">
              <p className="text-xs text-muted">Objetivo {q.objective}</p>
              <p className="mt-1 whitespace-pre-line">{q.scenario}</p>
              <p className="mt-2 text-bad">Elegiste: {ch === undefined ? "sin responder" : `${L[ch]}. ${q.options[ch]}`}</p>
              <p className="text-ok">Correcta: {L[q.correct]}. {q.options[q.correct]}</p>
              <p className="mt-2">{q.why_correct}</p>
              {ch !== undefined && q.why_wrong[String(ch)] && <p className="mt-1 text-muted">Por qué la tuya no: {q.why_wrong[String(ch)]}</p>}
              <p className="mt-2 font-semibold">Regla: {q.rule}</p>
              <a href={q.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-accent underline">Fuente</a>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex gap-3"><Link href="/" className="btn">Volver a Hoy</Link><Link href="/progreso" className="btn btn-ghost">Ver progreso</Link></div>
    </div>
  );
}
