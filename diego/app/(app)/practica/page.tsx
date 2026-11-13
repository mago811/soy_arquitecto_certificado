import Link from "next/link";
import { getObjectives, getObjective, practiceQuestions, objectiveTitle } from "@/lib/content";
import { allAnswers, masteryFrom } from "@/lib/progress";
import { QuestionRunner } from "@/components/QuestionRunner";

export default async function Practica({ searchParams }: { searchParams: Promise<{ obj?: string }> }) {
  const { obj } = await searchParams;
  const answers = await allAnswers();

  if (obj) {
    const id = Number(obj);
    const o = getObjective(id);
    if (!o) return <p>Objetivo inexistente.</p>;
    const seen = new Set(answers.filter((a) => a.objective === id && a.mode !== "sim").map((a) => a.question_id));
    // Primero las que nunca respondió, después el resto.
    const qs = practiceQuestions(id).sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
    return (
      <div>
        <Link href="/practica" className="text-sm text-muted hover:text-ink">← Todos los objetivos</Link>
        <h1 className="mt-2 text-xl font-bold">Objetivo {id}: {objectiveTitle(o)}</h1>
        <div className="mt-4"><QuestionRunner questions={qs} mode="practice" doneHref={`/leccion/${id}`} /></div>
      </div>
    );
  }

  const m = masteryFrom(answers);
  const rows = getObjectives()
    .map((o) => ({ o, n: practiceQuestions(o.id).length, pct: m.find((x) => x.objective.id === o.id)!.pct }))
    .sort((a, b) => a.pct - b.pct);
  return (
    <div>
      <h1 className="text-2xl font-bold">Práctica por objetivo</h1>
      <p className="mt-1 text-muted">Ordenados de más flojo a más fuerte. Arrancá por arriba.</p>
      <ul className="mt-5 flex flex-col gap-2">
        {rows.map(({ o, n, pct }) => (
          <li key={o.id}>
            {n > 0 ? (
              <Link href={`/practica?obj=${o.id}`} className="card flex items-center gap-3 p-3 hover:border-accent">
                <Row id={o.id} title={objectiveTitle(o)} pct={pct} n={n} />
              </Link>
            ) : (
              <div className="card flex items-center gap-3 p-3 opacity-60"><Row id={o.id} title={objectiveTitle(o)} pct={pct} n={0} /></div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ id, title, pct, n }: { id: number; title: string; pct: number; n: number }) {
  const color = pct >= 70 ? "text-ok" : pct >= 50 ? "text-warn" : "text-bad";
  return (
    <>
      <span className="w-8 shrink-0 text-sm font-bold text-muted">{id}</span>
      <span className="min-w-0 flex-1 text-sm">{title}</span>
      <span className="shrink-0 text-xs text-muted">{n ? `${n} preg.` : "pronto"}</span>
      <span className={`w-10 shrink-0 text-right text-sm font-bold ${color}`}>{pct}%</span>
    </>
  );
}
