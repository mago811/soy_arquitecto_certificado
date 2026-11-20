// Integra el banco v2 (inglés, estilo examen) que está en content/questions-en/.
// - Las preguntas nuevas se agregan a questions/obj-XX.json (práctica) y questions/sim-obj-XX.json (simulacro).
// - Las viejas (ids < 21) que estaban verificadas pasan a "descartada", con una nota. Quedan en el archivo
//   como historial y la app deja de mostrarlas.
// - Solo reemplaza un objetivo si el banco nuevo de ese objetivo ya está verificado (sin "no_verificado")
//   y tiene al menos MIN_PRACTICE de práctica y MIN_SIM de simulacro verificadas. Si no, lo deja como está y avisa.
// Después: npm run build-sims && npm run validate && npm run report
//
// Uso: npx tsx scripts/merge-en.ts [--dry]
import path from "node:path";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";

const ROOT = path.join(process.cwd(), "content");
const MIN_PRACTICE = 3;
const MIN_SIM = 3;
const dry = process.argv.includes("--dry");
const TODAY = "2026-11-20";

type Q = { id: string; objective: number; pool: "practice" | "sim"; status: string; verification: { date: string; verdict: string; notes: string } | null };
const read = (f: string) => JSON.parse(readFileSync(f, "utf8")) as { objective: number; questions: Q[] };
const write = (f: string, d: unknown) => { if (!dry) writeFileSync(f, JSON.stringify(d, null, 2) + "\n"); };
const num = (id: string) => Number(id.slice(-2));

const enDir = path.join(ROOT, "questions-en");
for (const f of readdirSync(enDir).filter((f) => /^obj-\d\d\.json$/.test(f)).sort()) {
  const en = read(path.join(enDir, f)).questions;
  const o = f.slice(4, 6);
  const pending = en.filter((q) => q.status === "no_verificado").length;
  const okP = en.filter((q) => q.pool === "practice" && q.status === "verificada").length;
  const okS = en.filter((q) => q.pool === "sim" && q.status === "verificada").length;
  if (pending || okP < MIN_PRACTICE || okS < MIN_SIM) {
    console.log(`⚠ obj-${o}: no se integra (sin verificar: ${pending}, práctica ok: ${okP}, sim ok: ${okS})`);
    continue;
  }
  for (const [pool, file] of [["practice", `obj-${o}.json`], ["sim", `sim-obj-${o}.json`]] as const) {
    const p = path.join(ROOT, "questions", file);
    const cur = existsSync(p) ? read(p) : { objective: Number(o), questions: [] };
    const fresh = en.filter((q) => q.pool === pool);
    const ids = new Set(fresh.map((q) => q.id));
    const old = cur.questions.filter((q) => !ids.has(q.id)).map((q) =>
      num(q.id) < 21 && q.status === "verificada"
        ? { ...q, status: "descartada", verification: { date: TODAY, verdict: "descartada", notes: `${q.verification?.notes ?? ""} · Reemplazada por el banco v2 (inglés, estilo examen) el ${TODAY}.`.replace(/^ · /, "") } }
        : q);
    write(p, { ...cur, questions: [...old, ...fresh] });
  }
  console.log(`✓ obj-${o}: ${okP} de práctica + ${okS} de simulacro (descartadas en verificación: ${en.filter((q) => q.status === "descartada").length})`);
}
