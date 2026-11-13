import Link from "next/link";
import { getObjectives, questionById, objectiveTitle } from "@/lib/content";
import { allAnswers } from "@/lib/progress";

const L = ["A", "B", "C", "D"];

export default async function Errores({ searchParams }: { searchParams: Promise<{ obj?: string }> }) {
  const { obj } = await searchParams;
  const filter = obj ? Number(obj) : null;
  const answers = await allAnswers();
  const wrong = answers.filter((a) => !a.correct).reverse();
  const byObj = new Map<number, number>();
  for (const w of wrong) byObj.set(w.objective, (byObj.get(w.objective) ?? 0) + 1);
  const shown = wrong.filter((w) => filter == null || w.objective === filter);

  return (
    <div>
      <h1 className="text-2xl font-bold">Registro de errores</h1>
      <p className="mt-1 text-muted">Cada pregunta que fallaste: qué elegiste, cuál era, por qué, y la regla para no repetirlo.</p>

      <div className="mt-4 flex flex-wrap gap-1.5 text-sm">
        <Link href="/errores" className={`rounded-lg border px-2.5 py-1 ${filter == null ? "border-accent bg-accent-soft text-accent" : "border-line"}`}>Todos ({wrong.length})</Link>
        {getObjectives().filter((o) => byObj.has(o.id)).map((o) => (
          <Link key={o.id} href={`/errores?obj=${o.id}`} title={objectiveTitle(o)}
            className={`rounded-lg border px-2.5 py-1 ${filter === o.id ? "border-accent bg-accent-soft text-accent" : "border-line"}`}>
            Obj. {o.id} ({byObj.get(o.id)})
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card mt-5 p-6 text-center text-muted">Nada por acá todavía.</div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {shown.map((w, k) => {
            const q = questionById(w.question_id);
            if (!q) return null;
            return (
              <li key={k} className="card p-4 text-sm">
                <p className="text-xs text-muted">
                  Obj. {q.objective} · {w.day.slice(8, 10)}/{w.day.slice(5, 7)} · {w.mode === "sim" ? "simulacro" : w.mode === "review" ? "repaso" : "práctica"}
                </p>
                <p className="mt-1 whitespace-pre-line">{q.scenario}</p>
                <p className="mt-2 text-bad">Elegiste: {w.chosen < 0 ? "sin responder" : `${L[w.chosen]}. ${q.options[w.chosen]}`}</p>
                <p className="text-ok">Correcta: {L[q.correct]}. {q.options[q.correct]}</p>
                <p className="mt-2">{q.why_correct}</p>
                <p className="mt-2 rounded-lg bg-accent-soft p-2 font-semibold">📌 {q.rule}</p>
                <a href={q.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-accent underline">Fuente oficial</a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
