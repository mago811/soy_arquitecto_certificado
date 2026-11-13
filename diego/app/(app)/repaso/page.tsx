import { dueReviews, pendingReviewCount } from "@/lib/progress";
import { QuestionRunner } from "@/components/QuestionRunner";

export default async function Repaso() {
  const [due, pending] = await Promise.all([dueReviews(), pendingReviewCount()]);
  return (
    <div>
      <h1 className="text-2xl font-bold">Repaso espaciado</h1>
      <p className="mt-1 text-muted">
        Las preguntas que fallaste vuelven a los 1, 3 y 7 días. Si la acertás, sube un escalón. Si la volvés a fallar, arranca de nuevo.
      </p>
      <p className="mt-2 text-sm text-muted">Para hoy: <b className="text-ink">{due.length}</b> · En la cola: {pending}</p>
      <div className="mt-5">
        {due.length ? (
          <QuestionRunner questions={due.map((d) => d.q)} mode="review" doneHref="/" />
        ) : (
          <div className="card p-6 text-center text-muted">No hay repasos para hoy. 🎉</div>
        )}
      </div>
    </div>
  );
}
