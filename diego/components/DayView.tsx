import Link from "next/link";
import { type PlanTask, getPlan, getObjective, getLesson, getLab, practiceQuestions, objectiveTitle, getSim, SIM_SIZE } from "@/lib/content";
import { planChecks, allAnswers, dueReviews } from "@/lib/progress";
import { formatDate, todayISO } from "@/lib/dates";
import { TaskCheck } from "./TaskCheck";
import { diagAttempts } from "@/lib/diag";

const ICON: Record<string, string> = {
  lesson: "📖", lab: "🛠️", practice: "✍️", review: "🔁", sim: "⏱️", errors: "🧾", progress: "📊", rules: "📌", text: "🎯",
};

export async function DayView({ n, isToday }: { n: number; isToday: boolean }) {
  const plan = getPlan();
  const day = plan.days.find((d) => d.day === n);
  if (!day) return <p>Ese día no existe.</p>;
  const [checks, answers, due, diags] = await Promise.all([planChecks(), allAnswers(), dueReviews(), isToday ? diagAttempts() : Promise.resolve([])]);
  const diagDone = diags.some((a) => a.finished_at);
  const diagOpen = diags.find((a) => !a.finished_at);
  const pastPending = plan.days.filter((d) => d.date < todayISO() && d.tasks.some((t) => !checks.has(t.id)));
  const answeredIds = new Set(answers.filter((a) => a.mode !== "sim").map((a) => a.question_id));
  const done = day.tasks.filter((t) => checks.has(t.id)).length;
  const isFuture = day.date > todayISO();

  function taskLink(t: PlanTask) {
    switch (t.type) {
      case "lesson": return getLesson(t.objective!) ? { href: `/leccion/${t.objective}`, ready: true } : { href: null, ready: false };
      case "lab": return getLab(t.objective!) ? { href: `/lab/${t.objective}`, ready: true } : { href: null, ready: false };
      case "practice": {
        const qs = practiceQuestions(t.objective);
        const ans = qs.filter((q) => answeredIds.has(q.id)).length;
        return qs.length ? { href: `/practica?obj=${t.objective}`, ready: true, extra: `${ans}/${qs.length} respondidas` } : { href: null, ready: false };
      }
      case "review": return { href: "/repaso", ready: true, extra: due.length ? `${due.length} para hoy` : "nada pendiente hoy" };
      case "sim": { const s = getSim(t.sim!); return s && s.questions.length >= SIM_SIZE ? { href: "/simulacros", ready: true } : { href: null, ready: false }; }
      case "errors": return { href: "/errores", ready: true };
      case "progress": return { href: "/progreso", ready: true };
      case "rules": return { href: "/reglas", ready: true };
      default: return { href: null, ready: true };
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">
        {isToday ? "Hoy · " : ""}Día {day.day} de 15 · <span className="capitalize">{formatDate(day.date)}</span>
      </p>
      <h1 className="mt-1 text-2xl font-bold leading-snug">{day.topic}</h1>
      {isToday && isFuture && <p className="mt-2 rounded-lg bg-accent-soft p-2.5 text-sm text-accent">El plan arranca mañana. Si querés, podés ir mirando el día 1.</p>}
      {isFuture && !isToday && <p className="mt-2 text-sm text-muted">Este día todavía no llegó. Podés mirarlo, pero lo ideal es ir de a uno.</p>}

      {isToday && !diagDone && (
        <div className="mt-4 rounded-xl border-2 border-accent bg-accent-soft p-4">
          <p className="font-bold text-accent">📋 Antes de seguir: test de nivel</p>
          <p className="mt-1 text-sm">
            Queremos saber cómo venís con lo que viste hasta hoy. Primero marcás qué hiciste de cada día y después respondés hasta 30
            preguntas (60 min). Te da un puntaje estimado y te dice qué repasar.
          </p>
          <Link href={diagOpen ? `/diagnostico/${diagOpen.id}` : "/diagnostico"} className="btn mt-3 inline-block">
            {diagOpen ? "Continuar el test" : "Hacer el test de nivel"}
          </Link>
        </div>
      )}
      {isToday && diagDone && pastPending.length > 0 && (
        <p className="mt-4 rounded-lg bg-warn-soft p-2.5 text-sm text-warn">
          Tenés tareas sin tildar en {pastPending.length === 1 ? "el día" : "los días"} {pastPending.map((d) => d.day).join(", ")}.{" "}
          <Link href="/plan" className="underline">Marcá lo que ya hiciste</Link> así el plan refleja dónde estás.
        </p>
      )}

      {day.objectives.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5 text-sm">
          {day.objectives.map((o) => {
            const obj = getObjective(o)!;
            return (
              <p key={o} className="text-muted">
                <span className="font-semibold text-ink">Obj. {o}</span> · {objectiveTitle(obj)}
                <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${obj.baseline <= 50 ? "bg-bad-soft text-bad" : "bg-ok-soft text-ok"}`}>
                  tu base: {obj.baseline}%
                </span>
              </p>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-bold">Tareas del día</h2>
        <span className="text-sm text-muted">{done}/{day.tasks.length} hechas</span>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {day.tasks.map((t) => {
          const l = taskLink(t);
          return (
            <li key={t.id} className="card flex items-start gap-3 p-3.5">
              <TaskCheck id={t.id} done={checks.has(t.id)} />
              <div className="min-w-0 flex-1">
                {l.href ? (
                  <Link href={l.href} className="font-medium hover:text-accent">{ICON[t.type]} {t.label}</Link>
                ) : (
                  <span className={l.ready ? "font-medium" : "text-muted"}>{ICON[t.type]} {t.label}</span>
                )}
                {"extra" in l && l.extra && <p className="text-xs text-muted">{l.extra}</p>}
                {!l.ready && <p className="text-xs text-warn">Contenido en preparación</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex justify-between text-sm">
        {n > 1 ? <Link href={`/dia/${n - 1}`} className="text-muted hover:text-ink">← Día {n - 1}</Link> : <span />}
        {n < 15 ? <Link href={`/dia/${n + 1}`} className="text-muted hover:text-ink">Día {n + 1} →</Link> : <span />}
      </div>
    </div>
  );
}
