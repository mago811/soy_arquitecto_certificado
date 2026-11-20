// Valida todo el contenido contra content/SPEC.md.
// Uso: npm run validate            (estructura + reglas)
//      npm run validate -- --links (además chequea que cada URL responda 200)
import { z } from "zod";
import { readFileSync } from "node:fs";
import path from "node:path";
import { allQuestions, objectives, domains, doc, sims, isOfficial, questionFiles } from "./lib";

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const QSchema = z.object({
  id: z.string().regex(/^o\d\d-[qs]\d\d$/),
  objective: z.number().int().min(1).max(37),
  pool: z.enum(["practice", "sim"]),
  scenario: z.string().min(40),
  options: z.array(z.string().min(1)).length(4),
  correct: z.number().int().min(0).max(3),
  why_correct: z.string().min(20),
  why_wrong: z.record(z.string(), z.string().min(10)),
  rule: z.string().min(10),
  source_url: z.string().url(),
  source_quote: z.string().min(10),
  status: z.enum(["verificada", "no_verificado", "descartada"]),
  verification: z.object({ date: z.string(), verdict: z.enum(["ok", "corregida", "descartada"]), notes: z.string() }).nullable(),
});

const objs = objectives();
if (objs.length !== 37) err(`objectives.json tiene ${objs.length} objetivos (esperado 37)`);
const doms = domains();
const w = doms.reduce((s, d) => s + d.weight, 0);
if (w !== 100) err(`Los pesos de domains.json suman ${w}`);

// Plan: ningún objetivo se da completo (lección + lab + práctica) en dos días distintos.
{
  const plan = JSON.parse(readFileSync(path.join(process.cwd(), "content", "plan.json"), "utf8")) as
    { days: { day: number; objectives: number[]; tasks: { id: string; type: string; objective?: number }[] }[] };
  const taskIds = new Set<string>();
  const fullDays = new Map<number, number[]>();
  const seen = new Set<number>();
  for (const d of plan.days) {
    for (const t of d.tasks) {
      if (taskIds.has(t.id)) err(`plan: id de tarea repetido ${t.id}`);
      taskIds.add(t.id);
      if (t.objective != null) seen.add(t.objective);
      if (t.objective != null && t.id.endsWith("-leccion")) fullDays.set(t.objective, [...(fullDays.get(t.objective) ?? []), d.day]);
    }
    for (const o of d.objectives) if (!d.tasks.some((t) => t.objective === o)) err(`plan: día ${d.day} lista el objetivo ${o} pero no tiene tareas de él`);
  }
  for (const [o, ds] of fullDays) if (ds.length > 1) err(`plan: el objetivo ${o} tiene la lección completa en los días ${ds.join(", ")} (usá una tarea "-repaso" en el segundo)`);
  for (const o of objs) if (!seen.has(o.id)) err(`plan: el objetivo ${o.id} no aparece en ningún día`);
}

// Preguntas
const ids = new Set<string>();
for (const { file, data } of questionFiles()) {
  for (const q of data.questions) {
    const r = QSchema.safeParse(q);
    if (!r.success) { err(`${q.id ?? file}: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`); continue; }
    if (ids.has(q.id)) err(`id repetido: ${q.id}`);
    ids.add(q.id);
    if (q.objective !== data.objective) err(`${q.id}: objective ${q.objective} en archivo del objetivo ${data.objective}`);
    if (!q.id.startsWith(`o${String(q.objective).padStart(2, "0")}-`)) err(`${q.id}: el prefijo no coincide con el objetivo`);
    if ((q.pool === "sim") !== q.id.includes("-s")) err(`${q.id}: pool ${q.pool} no coincide con el id`);
    const wrongKeys = Object.keys(q.why_wrong).map(Number).sort().join(",");
    const expected = [0, 1, 2, 3].filter((k) => k !== q.correct).join(",");
    if (wrongKeys !== expected) err(`${q.id}: why_wrong debe tener las claves ${expected} (tiene ${wrongKeys})`);
    if (new Set(q.options).size !== 4) err(`${q.id}: opciones repetidas`);
    if (!isOfficial(q.source_url)) err(`${q.id}: fuente no oficial ${q.source_url}`);
    if (q.status === "verificada" && !q.verification) err(`${q.id}: verificada sin bloque verification`);
    if (q.status === "descartada" && q.verification?.verdict !== "descartada") warn(`${q.id}: descartada sin verdict descartada`);
    const lens = q.options.map((o) => o.length);
    if (lens[q.correct] === Math.max(...lens) && lens[q.correct] > 1.5 * [...lens].sort((a, b) => a - b)[2]) warn(`${q.id}: la correcta es mucho más larga que el resto`);
  }
}

// Posición de la correcta por objetivo (que no sea siempre la misma letra)
for (const { data } of questionFiles()) {
  const counts = [0, 0, 0, 0];
  data.questions.forEach((q) => counts[q.correct]++);
  if (data.questions.length >= 6 && Math.max(...counts) > data.questions.length * 0.5) warn(`obj ${data.objective}: la correcta cae demasiado en la misma letra ${counts}`);
}

// Lecciones y labs
for (const o of objs) {
  for (const kind of ["lessons", "labs"] as const) {
    const d = doc(kind, o.id);
    if (!d) continue;
    const srcs = (d.data.sources as { url: string }[] | undefined) ?? [];
    if (d.data.objective !== o.id) err(`${kind}/obj-${o.id}: objective en frontmatter no coincide`);
    if (!srcs.length) err(`${kind}/obj-${o.id}: sin sources`);
    for (const s of srcs) if (!isOfficial(s.url)) err(`${kind}/obj-${o.id}: fuente no oficial ${s.url}`);
    if (kind === "lessons" && !d.data.rule) err(`lessons/obj-${o.id}: falta rule`);
    if (!["verificada", "no_verificado"].includes(String(d.data.status))) err(`${kind}/obj-${o.id}: status inválido`);
  }
}

// Simulacros: sin repetidos entre ellos, solo pool sim y verificadas, reparto por dominio
const all = new Map(allQuestions().map((q) => [q.id, q]));
const seen = new Map<string, number>();
for (const s of sims()) {
  const perDom: Record<string, number> = {};
  for (const id of s.questions) {
    const q = all.get(id);
    if (!q) { err(`sim-${s.id}: ${id} no existe`); continue; }
    if (q.pool !== "sim") err(`sim-${s.id}: ${id} es del pool de práctica`);
    if (q.status !== "verificada") err(`sim-${s.id}: ${id} no está verificada`);
    if (seen.has(id)) err(`${id} aparece en sim-${seen.get(id)} y en sim-${s.id}`);
    seen.set(id, s.id);
    const dom = objs.find((o) => o.id === q.objective)!.domain;
    perDom[dom] = (perDom[dom] ?? 0) + 1;
  }
  if (s.questions.length !== 60) err(`sim-${s.id}: tiene ${s.questions.length} preguntas (esperado 60)`);
  for (const d of doms) {
    const target = Math.round((d.weight / 100) * 60);
    const got = perDom[d.id] ?? 0;
    if (Math.abs(got - target) > 1) err(`sim-${s.id}: dominio ${d.id} tiene ${got} (objetivo ${target}±1)`);
  }
}

// Links
if (process.argv.includes("--links")) {
  const urls = new Set<string>();
  for (const q of allQuestions()) urls.add(q.source_url);
  for (const o of objs) for (const k of ["lessons", "labs"] as const) for (const s of ((doc(k, o.id)?.data.sources as { url: string }[]) ?? [])) urls.add(s.url);
  await Promise.all([...urls].map(async (u) => {
    try {
      const r = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(20000) });
      if (r.status !== 200) err(`link ${r.status}: ${u}`);
    } catch (e) { err(`link caído: ${u} (${(e as Error).message})`); }
  }));
  console.log(`Links chequeados: ${urls.size}`);
}

const qs = allQuestions();
console.log(`Preguntas: ${qs.length} · verificadas: ${qs.filter((q) => q.status === "verificada").length} · descartadas: ${qs.filter((q) => q.status === "descartada").length} · sin verificar: ${qs.filter((q) => q.status === "no_verificado").length}`);
for (const m of warnings) console.log(`⚠ ${m}`);
for (const m of errors) console.log(`✗ ${m}`);
if (errors.length) { console.log(`\n${errors.length} errores.`); process.exit(1); }
console.log("✓ Contenido válido.");
