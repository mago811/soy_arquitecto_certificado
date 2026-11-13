import Link from "next/link";
import { getSim, SIM_SIZE } from "@/lib/content";
import { simAttempts } from "@/lib/progress";
import { startSim } from "../../actions";

export default async function Simulacros() {
  const attempts = await simAttempts();
  return (
    <div>
      <h1 className="text-2xl font-bold">Simulacros</h1>
      <p className="mt-1 text-muted">
        60 preguntas, 120 minutos, sin ver respuestas hasta terminar. Preguntas distintas en cada simulacro y repartidas por dominio según la guía oficial.
      </p>
      <ul className="mt-5 flex flex-col gap-3">
        {[1, 2, 3].map((id) => {
          const sim = getSim(id);
          const ready = !!sim && sim.questions.length >= SIM_SIZE;
          const mine = attempts.filter((a) => a.sim_id === id);
          const open = mine.find((a) => !a.finished_at);
          const finished = mine.filter((a) => a.finished_at);
          return (
            <li key={id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">Simulacro {id}</p>
                  <p className="text-sm text-muted">{id === 1 ? "Día 8 · sáb 21/11" : id === 2 ? "Día 13 · jue 26/11 (go/no-go)" : "Día 14 · opcional"}</p>
                </div>
                {ready ? (
                  <form action={startSim.bind(null, id)}>
                    <button className="btn">{open ? "Continuar" : finished.length ? "Rendir otra vez" : "Empezar"}</button>
                  </form>
                ) : (
                  <span className="text-sm text-warn">En preparación</span>
                )}
              </div>
              {finished.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
                  {finished.map((a) => (
                    <li key={a.id} className="flex justify-between">
                      <span className="text-muted">{new Date(a.finished_at!).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" })}</span>
                      <Link href={`/simulacro/${id}/informe/${a.id}`} className="font-semibold text-accent underline">
                        {Number(a.score_pct)}% · ~{a.scaled}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
