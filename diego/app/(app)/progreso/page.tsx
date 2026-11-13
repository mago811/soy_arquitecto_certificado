import Link from "next/link";
import { getDomains, getObjectives, objectiveTitle, getSim } from "@/lib/content";
import { allAnswers, masteryFrom, domainMastery, dailyEvolution, ruleReviews, simAttempts, scoreSim, planChecks } from "@/lib/progress";
import { getPlan } from "@/lib/content";
import { EvolutionChart } from "@/components/EvolutionChart";

export default async function Progreso() {
  const [answers, rules, sims2, checks] = await Promise.all([allAnswers(), ruleReviews(), simAttempts(2), planChecks()]);
  const m = masteryFrom(answers);
  const doms = domainMastery(m);
  const evo = dailyEvolution(answers);

  // Go/no-go: último simulacro 2 terminado.
  const last2 = sims2.find((a) => a.finished_at);
  const s2 = last2 ? scoreSim(getSim(2)!.questions, last2.answers) : null;
  const c1 = s2 ? s2.pct >= 80 : false;
  const weakDom = s2 ? s2.perDomain.filter((d) => d.pct != null && d.pct < 70) : [];
  const c2 = s2 ? weakDom.length === 0 : false;
  const c3 = rules.size >= getObjectives().length;
  const go = c1 && c2 && c3;

  const plan = getPlan();
  const totalTasks = plan.days.reduce((s, d) => s + d.tasks.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-bold">Progreso</h1>
        <p className="mt-1 text-muted">
          Arranca con tu score report del 13/11 y se mueve con cada respuesta. El punto de partida pesa como 3 respuestas, así una racha buena se nota rápido.
        </p>
      </section>

      <section className={`card p-5 ${go ? "border-ok bg-ok-soft" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Go / no-go · jueves 26/11</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-bold text-white ${go ? "bg-ok" : "bg-bad"}`}>{go ? "GO" : "NO-GO todavía"}</span>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm">
          <Check ok={c1} text={`80% o más en el simulacro 2${s2 ? ` (sacaste ${s2.pct}%)` : " (todavía no lo rendiste)"}`} />
          <Check ok={c2} text={`Ningún dominio por debajo del 70% en el simulacro 2${weakDom.length ? ` (flojos: ${weakDom.map((d) => d.domain.name).join(", ")})` : ""}`} />
          <Check ok={c3} text={<>Todas las reglas de bolsillo repasadas ({rules.size}/{getObjectives().length}) · <Link href="/reglas" className="underline">ir a reglas</Link></>} />
        </ul>
      </section>

      <section>
        <h2 className="font-bold">Evolución día a día</h2>
        <p className="text-sm text-muted">Dominio promedio de los 37 objetivos al cierre de cada día. La línea punteada es el 70%.</p>
        <div className="card mt-2 p-3"><EvolutionChart data={evo} /></div>
      </section>

      <section>
        <h2 className="font-bold">Por dominio</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {doms.map((d) => (
            <li key={d.domain.id}>
              <div className="flex justify-between text-sm"><span>{d.domain.name} <span className="text-muted">· {d.domain.weight}% del examen</span></span><b>{d.pct}%</b></div>
              <Bar pct={d.pct} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-bold">Por objetivo</h2>
        <p className="text-sm text-muted">Gris: tu base del score report. Color: hoy.</p>
        {getDomains().map((d) => (
          <div key={d.id} className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{d.name}</p>
            <ul className="mt-1 flex flex-col gap-2.5">
              {m.filter((x) => x.objective.domain === d.id).sort((a, b) => a.objective.id - b.objective.id).map((x) => (
                <li key={x.objective.id}>
                  <div className="flex justify-between gap-2 text-sm">
                    <Link href={`/practica?obj=${x.objective.id}`} className="min-w-0 truncate hover:text-accent">
                      <span className="font-semibold">{x.objective.id}.</span> {objectiveTitle(x.objective)}
                    </Link>
                    <span className="shrink-0"><span className="text-muted">{x.baseline}% → </span><b>{x.pct}%</b></span>
                  </div>
                  <Bar pct={x.pct} base={x.baseline} />
                  <p className="text-xs text-muted">{x.attempts ? `${x.correct}/${x.attempts} respuestas bien` : "sin respuestas todavía"}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-bold">Plan de 15 días</h2>
        <p className="text-sm text-muted">{checks.size} de {totalTasks} tareas hechas · <Link href="/plan" className="underline">ver checklist</Link></p>
        <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
          {plan.days.map((d) => {
            const done = d.tasks.filter((t) => checks.has(t.id)).length;
            const all = done === d.tasks.length;
            return (
              <Link key={d.day} href={`/dia/${d.day}`} title={d.topic}
                className={`grid h-10 place-items-center rounded-md text-xs font-bold ${all ? "bg-ok text-white" : done ? "bg-warn-soft text-warn" : "bg-surface border border-line text-muted"}`}>
                {d.day}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Bar({ pct, base }: { pct: number; base?: number }) {
  const color = pct >= 70 ? "bg-ok" : pct >= 50 ? "bg-warn" : "bg-bad";
  return (
    <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-line">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      {base != null && <div className="absolute top-0 h-full w-0.5 bg-muted" style={{ left: `calc(${base}% - 1px)` }} />}
    </div>
  );
}

function Check({ ok, text }: { ok: boolean; text: React.ReactNode }) {
  return (
    <li className="flex gap-2"><span className={ok ? "text-ok" : "text-bad"}>{ok ? "✓" : "✗"}</span><span>{text}</span></li>
  );
}
