import Link from "next/link";
import { startDiag } from "../../actions";
import { planChecks } from "@/lib/progress";
import { coveredDays, diagAttempts, objectiveFirstDay, DIAG_SIZE, DIAG_MINUTES, STATUS_LABEL, type DayStatus } from "@/lib/diag";
import { currentPlanDay, formatDate } from "@/lib/dates";

export default async function Diagnostico() {
  const upTo = currentPlanDay();
  const [checks, attempts] = await Promise.all([planChecks(), diagAttempts()]);
  const days = coveredDays(upTo);
  const open = attempts.find((a) => !a.finished_at);
  const finished = attempts.filter((a) => a.finished_at);
  const nObjs = objectiveFirstDay(upTo).size;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Test de nivel</p>
      <h1 className="mt-1 text-2xl font-bold">¿Cómo venís? Medilo antes de seguir</h1>
      <p className="mt-2 text-muted">
        Hasta {DIAG_SIZE} preguntas de los {nObjs} objetivos que el plan ya dio (días 1 a {upTo}), {DIAG_MINUTES} minutos, sin ver respuestas
        hasta terminar, como en el examen. Al final ves un puntaje estimado y qué objetivos todavía están flojos.
      </p>

      {open ? (
        <div className="card mt-5 p-4">
          <p className="font-semibold">Tenés un test empezado.</p>
          <Link href={`/diagnostico/${open.id}`} className="btn mt-3 inline-block">Continuar</Link>
        </div>
      ) : (
        <form action={startDiag} className="mt-5">
          <h2 className="font-bold">1. Contanos qué hiciste de cada día</h2>
          <p className="text-sm text-muted">
            Sé honesto: sirve para saber si lo que falla es algo que estudiaste o algo que salteaste. Los días que marques como
            &quot;completo&quot; quedan tildados en el plan.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {days.map((d) => {
              const done = d.tasks.filter((t) => checks.has(t.id)).length;
              const def: DayStatus = done === d.tasks.length ? "completo" : done > 0 ? "a_medias" : "no";
              return (
                <li key={d.day} className="card p-3">
                  <p className="text-sm font-semibold">Día {d.day} · <span className="capitalize">{formatDate(d.date)}</span>
                    <span className="ml-2 text-xs font-normal text-muted">({done}/{d.tasks.length} tareas tildadas)</span></p>
                  <p className="text-sm text-muted">{d.topic}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {(Object.keys(STATUS_LABEL) as DayStatus[]).map((s) => (
                      <label key={s} className="flex items-center gap-1.5">
                        <input type="radio" name={`day-${d.day}`} value={s} defaultChecked={s === def} className="accent-[var(--accent)]" />
                        {STATUS_LABEL[s]}
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <h2 className="mt-6 font-bold">2. Rendí el test</h2>
          <p className="text-sm text-muted">Reservá {DIAG_MINUTES} minutos sin cortes. Si se corta, podés volver: el reloj sigue corriendo.</p>
          <button className="btn mt-3">Guardar y empezar el test</button>
        </form>
      )}

      {finished.length > 0 && (
        <>
          <h2 className="mt-8 font-bold">Tests anteriores</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {finished.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-line py-1.5">
                <span className="text-muted">
                  {new Date(a.finished_at!).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" })} · hasta el día {a.upto_day}
                </span>
                <Link href={`/diagnostico/${a.id}/informe`} className="font-semibold text-accent underline">{Number(a.score_pct)}% · ~{a.scaled}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
