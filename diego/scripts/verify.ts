// Verificador independiente: revisa cada pregunta "no_verificado" contra la página que cita.
// No ve el razonamiento del generador: solo la pregunta y la fuente.
//
// Uso: npm run verify -- --obj 16        (o --all)
import { z } from "zod";
import { structured, fetchDoc } from "./claude";
import { questionFiles, writeJson } from "./lib";

const all = process.argv.includes("--all");
const i = process.argv.indexOf("--obj");
const only = i > 0 ? Number(process.argv[i + 1]) : null;
if (!all && only == null) { console.error("Pasá --obj <n> o --all"); process.exit(1); }

const Verdict = z.object({
  marked_answer_is_correct: z.boolean(),
  another_option_also_defensible: z.boolean(),
  quote_found_and_supports: z.boolean(),
  explanations_accurate: z.boolean(),
  verdict: z.enum(["ok", "corregida", "descartada"]),
  notes: z.string(),
  // Solo si verdict = "corregida": la pregunta corregida completa.
  fixed: z.object({
    scenario: z.string(), options: z.array(z.string()), correct: z.number().int(),
    why_correct: z.string(), why_wrong: z.array(z.object({ option: z.number().int(), why: z.string() })),
    rule: z.string(), source_quote: z.string(),
  }).nullable(),
});

const system = `Sos un verificador independiente de preguntas del examen Claude Certified Architect – Foundations.
No escribiste la pregunta. Desconfiá. Usá SOLO la página oficial que te paso como fuente de verdad.
Chequeá: (a) la opción marcada es correcta según la página; (b) ninguna otra opción es también defendible;
(c) la cita aparece (textual o casi) en la página y respalda la respuesta; (d) las explicaciones no afirman nada falso.
- Si todo pasa: verdict "ok", fixed null.
- Si hay un problema chico arreglable (redacción, distractor ambiguo, cita mal copiada): verdict "corregida" y devolvé la pregunta corregida en fixed.
- Si el problema es de fondo: verdict "descartada", fixed null.
Escribí notes en español, breve.`;

const today = new Date().toISOString().slice(0, 10);
const cache = new Map<string, string>();

for (const { file, data } of questionFiles()) {
  if (!all && data.objective !== only) continue;
  let changed = false;
  for (const q of data.questions) {
    if (q.status !== "no_verificado") continue;
    if (!cache.has(q.source_url)) cache.set(q.source_url, await fetchDoc(q.source_url));
    const page = cache.get(q.source_url)!.slice(0, 150_000);
    const v = await structured(Verdict, system,
      `<page url="${q.source_url}">\n${page}\n</page>\n\n<question>\n${JSON.stringify({ ...q, status: undefined, verification: undefined }, null, 2)}\n</question>`);
    if (v.verdict === "corregida" && v.fixed && v.fixed.options.length === 4) {
      const ww: Record<string, string> = {};
      for (const w of v.fixed.why_wrong) if (w.option !== v.fixed.correct) ww[String(w.option)] = w.why;
      Object.assign(q, { ...v.fixed, why_wrong: ww });
    }
    const pass = v.verdict !== "descartada" && (v.verdict === "corregida" || (v.marked_answer_is_correct && !v.another_option_also_defensible && v.quote_found_and_supports));
    q.status = pass ? "verificada" : "descartada";
    q.verification = { date: today, verdict: pass ? v.verdict : "descartada", notes: v.notes };
    console.log(`${q.id}: ${q.verification.verdict} — ${v.notes.slice(0, 100)}`);
    changed = true;
  }
  if (changed) writeJson(file, data);
}
console.log("Listo. Corré npm run validate y npm run report.");
