// Genera preguntas para un objetivo leyendo ANTES las páginas oficiales.
// Re-ejecutable: agrega preguntas nuevas al archivo existente sin tocar las verificadas.
//
// Uso:
//   npm run generate -- --obj 16 --n 8 --pool practice --sources https://code.claude.com/docs/en/memory,https://code.claude.com/docs/en/settings
//   npm run generate -- --obj 16 --n 3 --pool sim      (toma las fuentes de las lecciones/preguntas existentes)
//
// Todo lo generado queda con status "no_verificado". Después hay que correr `npm run verify -- --obj 16`.
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import { structured, fetchDoc, QuestionOut } from "./claude";
import { ROOT, pad, objectives, doc, writeJson, isOfficial, type Q } from "./lib";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const objId = Number(arg("obj"));
const n = Number(arg("n") ?? 8);
const pool = (arg("pool") ?? "practice") as "practice" | "sim";
const obj = objectives().find((o) => o.id === objId);
if (!obj) { console.error("Pasá --obj <1..37>"); process.exit(1); }

const file = path.join(ROOT, "questions", `obj-${pad(objId)}.json`);
const existing: { objective: number; questions: Q[] } = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { objective: objId, questions: [] };

let sources = (arg("sources") ?? "").split(",").filter(Boolean);
if (!sources.length) {
  const fromLesson = ((doc("lessons", objId)?.data.sources as { url: string }[]) ?? []).map((s) => s.url);
  sources = [...new Set([...fromLesson, ...existing.questions.map((q) => q.source_url)])];
}
sources = sources.filter(isOfficial);
if (!sources.length) { console.error("No hay fuentes oficiales. Pasá --sources."); process.exit(1); }

console.log(`Leyendo ${sources.length} páginas oficiales…`);
const pages = await Promise.all(sources.map(async (u) => `<page url="${u}">\n${(await fetchDoc(u)).slice(0, 120_000)}\n</page>`));

const spec = readFileSync(path.join(ROOT, "SPEC.md"), "utf8");
const avoid = existing.questions.map((q) => `- ${q.scenario.slice(0, 160)}`).join("\n");

const system = `Escribís preguntas de práctica para el examen Claude Certified Architect – Foundations (CCAR-F).
Seguís al pie de la letra este contrato:\n\n${spec}\n
Solo podés afirmar lo que dicen las páginas oficiales que te paso. source_url tiene que ser una de esas URLs y source_quote una frase copiada textual de esa página.`;

const user = `Objetivo ${obj.id}: "${obj.text}"

Escribí ${n} preguntas NUEVAS de escenario (pool "${pool}"), en español rioplatense simple, nombres técnicos en inglés.
Cuatro opciones, una sola correcta, distractores plausibles (errores reales de alguien que conoce el tema por arriba), largos parecidos.
Repartí la posición de la correcta entre 0, 1, 2 y 3. why_wrong: una entrada por cada opción incorrecta.

No repitas estos escenarios ya existentes:
${avoid || "(ninguno)"}

Páginas oficiales:
${pages.join("\n\n")}`;

const out = await structured(z.object({ questions: z.array(QuestionOut) }), system, user);

const prefix = `o${pad(objId)}-${pool === "sim" ? "s" : "q"}`;
let next = Math.max(0, ...existing.questions.filter((q) => q.id.startsWith(prefix)).map((q) => Number(q.id.slice(-2)))) + 1;
let added = 0;
for (const g of out.questions) {
  if (g.options.length !== 4 || g.correct < 0 || g.correct > 3 || !sources.includes(g.source_url)) { console.warn("Descarto una pregunta mal formada"); continue; }
  const why_wrong: Record<string, string> = {};
  for (const w of g.why_wrong) if (w.option !== g.correct) why_wrong[String(w.option)] = w.why;
  existing.questions.push({
    id: `${prefix}${pad(next++)}`, objective: objId, pool,
    scenario: g.scenario, options: g.options, correct: g.correct, why_correct: g.why_correct, why_wrong,
    rule: g.rule, source_url: g.source_url, source_quote: g.source_quote,
    status: "no_verificado", verification: null,
  });
  added++;
}
writeJson(file, existing);
console.log(`Agregadas ${added} preguntas a ${path.relative(process.cwd(), file)}. Ahora: npm run verify -- --obj ${objId}`);
