// Arma content/sims/sim-1.json, sim-2.json y sim-3.json con el pool "sim" verificado.
// - 60 preguntas por simulacro, reparto por dominio según domains.json (27/18/20/20/15 → 16/11/12/12/9).
// - Ninguna pregunta se repite entre simulacros.
// - Dentro de cada dominio, las preguntas de cada objetivo se reparten en ronda entre los 3 simulacros,
//   así cada simulacro cubre la mayor cantidad posible de objetivos.
// - Si a un dominio le faltan preguntas, el hueco se completa con otro dominio que tenga sobrante
//   (el validador tolera ±1 por dominio) y se avisa.
// - Determinístico: el orden final sale de un shuffle con semilla fija por simulacro.
//
// Uso: npm run build-sims   (o npm run build-sims -- --dry para ver el reparto sin escribir)
import path from "node:path";
import { mkdirSync } from "node:fs";
import { ROOT, allQuestions, objectives, domains, writeJson, type Q } from "./lib";

const N_SIMS = 3;
const SIZE = 60;

const objs = objectives();
const doms = domains();
const domainOf = (q: Q) => objs.find((o) => o.id === q.objective)!.domain;
const pool = allQuestions().filter((q) => q.pool === "sim" && q.status === "verificada");

// Objetivo por dominio y simulacro (ajustado para que sume exactamente 60).
const target: Record<string, number> = {};
for (const d of doms) target[d.id] = Math.round((d.weight / 100) * SIZE);
const diff = SIZE - Object.values(target).reduce((a, b) => a + b, 0);
if (diff !== 0) target[doms[0].id] += diff;

const sims: Q[][] = Array.from({ length: N_SIMS }, () => []);
const leftovers: Q[] = [];
const warnings: string[] = [];

for (const d of doms) {
  // Ronda por objetivo: o1-s01 → sim1, o1-s02 → sim2, o1-s03 → sim3, o1-s04 → sim1…
  // Arrancando en un simulacro distinto por objetivo para emparejar los totales.
  const byObj = new Map<number, Q[]>();
  for (const q of pool.filter((q) => domainOf(q) === d.id).sort((a, b) => a.id.localeCompare(b.id))) {
    byObj.set(q.objective, [...(byObj.get(q.objective) ?? []), q]);
  }
  const buckets: Q[][] = Array.from({ length: N_SIMS }, () => []);
  let start = 0;
  for (const [, qs] of [...byObj.entries()].sort((a, b) => a[0] - b[0])) {
    qs.forEach((q, i) => buckets[(start + i) % N_SIMS].push(q));
    start = (start + qs.length) % N_SIMS;
  }
  // Recortar el sobrante de cada simulacro y pasar huecos al de al lado.
  for (let s = 0; s < N_SIMS; s++) {
    while (buckets[s].length > target[d.id]) {
      const extra = buckets[s].pop()!;
      const needy = buckets.findIndex((b) => b.length < target[d.id]);
      if (needy >= 0) buckets[needy].push(extra);
      else leftovers.push(extra);
    }
  }
  for (let s = 0; s < N_SIMS; s++) {
    if (buckets[s].length < target[d.id]) warnings.push(`sim-${s + 1}: dominio ${d.id} tiene ${buckets[s].length} de ${target[d.id]}`);
    sims[s].push(...buckets[s]);
  }
}

// Completar huecos con sobrantes de otros dominios.
for (let s = 0; s < N_SIMS; s++) {
  while (sims[s].length < SIZE && leftovers.length) {
    const q = leftovers.shift()!;
    sims[s].push(q);
    warnings.push(`sim-${s + 1}: completa con ${q.id} (dominio ${domainOf(q)})`);
  }
}

// Shuffle determinístico (mulberry32).
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dry = process.argv.includes("--dry");
const dir = path.join(ROOT, "sims");
mkdirSync(dir, { recursive: true });
sims.forEach((qs, s) => {
  const r = rng(20261128 + s);
  const ids = qs.map((q) => q.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  if (!dry) writeJson(path.join(dir, `sim-${s + 1}.json`), { id: s + 1, questions: ids });
  const per = doms.map((d) => `${d.id} ${qs.filter((q) => domainOf(q) === d.id).length}`).join(" · ");
  const nObj = new Set(qs.map((q) => q.objective)).size;
  console.log(`sim-${s + 1}: ${ids.length} preguntas · ${per} · ${nObj} objetivos`);
});
console.log(`Pool sim verificado: ${pool.length} · sin usar: ${leftovers.length}`);
for (const w of warnings) console.log(`⚠ ${w}`);
