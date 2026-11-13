import Link from "next/link";
import { getDomains, pocketRules, objectiveTitle } from "@/lib/content";
import { ruleReviews } from "@/lib/progress";
import { RuleButton } from "@/components/RuleButton";

export default async function Reglas() {
  const rules = pocketRules();
  const reviewed = await ruleReviews();
  const available = rules.filter((r) => r.rule).length;
  return (
    <div>
      <h1 className="text-2xl font-bold">Reglas de bolsillo</h1>
      <p className="mt-1 text-muted">Una línea por objetivo. Leela, decila en voz alta, marcala. Para el go/no-go tienen que estar las 37.</p>
      <p className="mt-2 text-sm">Repasadas: <b>{reviewed.size}</b>/37 · Disponibles: {available}/37</p>
      {getDomains().map((d) => (
        <section key={d.id} className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">{d.name}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {rules.filter((r) => r.objective.domain === d.id).sort((a, b) => a.objective.id - b.objective.id).map(({ objective: o, rule }) => (
              <li key={o.id} className="card flex items-start gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/leccion/${o.id}`} className="text-xs text-muted hover:text-accent">{o.id}. {objectiveTitle(o)}</Link>
                  <p className={`mt-0.5 ${rule ? "font-medium" : "text-sm text-muted"}`}>{rule ?? "En preparación"}</p>
                </div>
                {rule && <RuleButton objective={o.id} reviewed={reviewed.has(o.id)} />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
