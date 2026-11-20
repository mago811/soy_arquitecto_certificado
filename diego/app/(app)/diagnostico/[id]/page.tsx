import { notFound, redirect } from "next/navigation";
import { questionById } from "@/lib/content";
import { diagAttempt, diagDeadline } from "@/lib/diag";
import { SimRunner } from "@/components/SimRunner";

export default async function DiagIntento({ params }: { params: Promise<{ id: string }> }) {
  const a = await diagAttempt(Number((await params).id));
  if (!a) notFound();
  if (a.finished_at) redirect(`/diagnostico/${a.id}/informe`);
  // Al cliente NO le mandamos la correcta ni las explicaciones.
  const questions = a.questions.map((id) => questionById(id)).filter((q) => !!q).map((q) => ({ id: q.id, scenario: q.scenario, options: q.options }));
  return (
    <SimRunner kind="diag" simId={0} attemptId={a.id} questions={questions}
      initialAnswers={a.answers} deadline={diagDeadline(a.started_at).toISOString()} />
  );
}
