import Link from "next/link";
import { getPlan } from "@/lib/content";
import { planChecks } from "@/lib/progress";
import { currentPlanDay, formatDate } from "@/lib/dates";

export default async function Plan() {
  const plan = getPlan();
  const checks = await planChecks();
  const today = currentPlanDay();
  return (
    <div>
      <h1 className="text-2xl font-bold">Plan de 15 días</h1>
      <p className="mt-1 text-muted">Lo hecho y lo pendiente. Tocá un día para ver sus tareas.</p>
      <ol className="mt-5 flex flex-col gap-2">
        {plan.days.map((d) => {
          const done = d.tasks.filter((t) => checks.has(t.id)).length;
          const all = done === d.tasks.length;
          return (
            <li key={d.day}>
              <Link href={`/dia/${d.day}`} className={`card flex items-center gap-3 p-3.5 hover:border-accent ${d.day === today ? "border-accent" : ""}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${all ? "bg-ok text-white" : d.day === today ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
                  {all ? "✓" : d.day}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs capitalize text-muted">{formatDate(d.date)}{d.day === today ? " · hoy" : ""}</p>
                  <p className="truncate font-medium">{d.topic}</p>
                </div>
                <span className="shrink-0 text-sm text-muted">{done}/{d.tasks.length}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
