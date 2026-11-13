import { notFound, redirect } from "next/navigation";
import { getSim, questionById } from "@/lib/content";
import { simAttempt, deadlineOf } from "@/lib/progress";
import { SimRunner } from "@/components/SimRunner";

export default async function Intento({ params }: { params: Promise<{ sim: string; id: string }> }) {
  const p = await params;
  const a = await simAttempt(Number(p.id));
  if (!a || a.sim_id !== Number(p.sim)) notFound();
  if (a.finished_at) redirect(`/simulacro/${a.sim_id}/informe/${a.id}`);
  const sim = getSim(a.sim_id);
  if (!sim) notFound();
  // Al cliente NO le mandamos la correcta ni las explicaciones.
  const questions = sim.questions.map((id) => {
    const q = questionById(id)!;
    return { id: q.id, scenario: q.scenario, options: q.options };
  });
  return (
    <SimRunner
      simId={a.sim_id} attemptId={a.id} questions={questions}
      initialAnswers={a.answers} deadline={deadlineOf(a.started_at).toISOString()}
    />
  );
}
