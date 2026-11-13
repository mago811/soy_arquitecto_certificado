import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson, getLab, getObjective, practiceQuestions } from "@/lib/content";
import { ruleReviews } from "@/lib/progress";
import { RuleButton } from "@/components/RuleButton";
import { Sources } from "@/components/Sources";

export default async function Leccion({ params }: { params: Promise<{ obj: string }> }) {
  const id = Number((await params).obj);
  const obj = getObjective(id);
  const lesson = getLesson(id);
  if (!obj || !lesson) notFound();
  const reviewed = (await ruleReviews()).has(id);
  const nq = practiceQuestions(id).length;
  return (
    <article>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Lección · objetivo {id}</p>
      <h1 className="mt-1 text-2xl font-bold">{lesson.title}</h1>
      <p className="mt-2 text-sm italic text-muted">{obj.text}</p>
      {lesson.status !== "verificada" && (
        <p className="mt-3 rounded-lg bg-warn-soft p-3 text-sm text-warn">Esta lección todavía no pasó la verificación contra la documentación oficial.</p>
      )}
      {lesson.rule && (
        <div className="card mt-5 flex items-start gap-3 border-accent bg-accent-soft p-4">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">Regla de bolsillo</p>
            <p className="mt-1 font-semibold">{lesson.rule}</p>
          </div>
          <RuleButton objective={id} reviewed={reviewed} />
        </div>
      )}
      <div className="prose-c mt-4" dangerouslySetInnerHTML={{ __html: lesson.html }} />
      <Sources sources={lesson.sources} />
      <div className="mt-8 flex flex-wrap gap-2">
        {getLab(id) && <Link href={`/lab/${id}`} className="btn btn-ghost">🛠️ Ir al laboratorio</Link>}
        {nq > 0 && <Link href={`/practica?obj=${id}`} className="btn">✍️ Practicar ({nq} preguntas)</Link>}
      </div>
    </article>
  );
}
