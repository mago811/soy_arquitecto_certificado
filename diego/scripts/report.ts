// Genera content/reports/content-report.md y content/reports/no-verificado.md
import { writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, allQuestions, objectives, domains, doc, sims } from "./lib";

const objs = objectives();
const doms = domains();
const qs = allQuestions();
const today = new Date().toISOString().slice(0, 10);

const rows = objs.map((o) => {
  const mine = qs.filter((q) => q.objective === o.id);
  const c = (s: string, pool?: string) => mine.filter((q) => q.status === s && (!pool || q.pool === pool)).length;
  const l = doc("lessons", o.id), lab = doc("labs", o.id);
  return {
    o, total: mine.length,
    practice: c("verificada", "practice"), sim: c("verificada", "sim"),
    verified: c("verificada"), discarded: c("descartada"), pending: c("no_verificado"),
    corrected: mine.filter((q) => q.verification?.verdict === "corregida").length,
    lesson: l ? String(l.data.status) : "—", lab: lab ? String(lab.data.status) : "—",
  };
});

const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0);
let md = `# Reporte de contenido\n\nGenerado: ${today}\n\n`;
md += `**Totales:** ${sum("total")} preguntas generadas · ${sum("verified")} verificadas (${sum("corrected")} con corrección) · ${sum("discarded")} descartadas · ${sum("pending")} sin verificar.\n\n`;
md += `Pool práctica verificada: ${sum("practice")} · pool simulacros verificada: ${sum("sim")}\n\n`;
md += `| # | Dominio | Base | Generadas | Verificadas | Corregidas | Descartadas | Sin verificar | Lección | Lab |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  md += `| ${r.o.id} | ${r.o.domain} | ${r.o.baseline}% | ${r.total} | ${r.verified} | ${r.corrected} | ${r.discarded} | ${r.pending} | ${r.lesson} | ${r.lab} |\n`;
}
md += `\n## Simulacros\n\n`;
for (const s of sims()) {
  const per: Record<string, number> = {};
  for (const id of s.questions) { const q = qs.find((x) => x.id === id); if (q) { const d = objs.find((o) => o.id === q.objective)!.domain; per[d] = (per[d] ?? 0) + 1; } }
  md += `- Simulacro ${s.id}: ${s.questions.length} preguntas · ${doms.map((d) => `${d.id} ${per[d.id] ?? 0}`).join(" · ")}\n`;
}
if (!sims().length) md += `Todavía no armados.\n`;
md += `\n## Descartadas\n\n`;
for (const q of qs.filter((q) => q.status === "descartada")) md += `- **${q.id}**: ${q.verification?.notes ?? ""}\n`;
writeFileSync(path.join(ROOT, "reports", "content-report.md"), md);

let nv = `# Lo que no se pudo verificar contra la documentación oficial\n\nGenerado: ${today}. Nada de esto se muestra en práctica ni simulacros.\n\n`;
const pend = qs.filter((q) => q.status === "no_verificado");
nv += `## Preguntas sin verificar (${pend.length})\n\n`;
for (const q of pend) nv += `- ${q.id} (obj ${q.objective})\n`;
nv += `\n## Lecciones y labs sin verificar\n\n`;
for (const o of objs) for (const k of ["lessons", "labs"] as const) {
  const d = doc(k, o.id);
  if (d && d.data.status !== "verificada") nv += `- ${k}/obj-${String(o.id).padStart(2, "0")}.md\n`;
  if (d) for (const m of d.content.matchAll(/<!--\s*no verificado:([\s\S]*?)-->/g)) nv += `  - ${k}/obj-${o.id}: ${m[1].trim()}\n`;
}
nv += `\n## Mapeo objetivo → dominio\n\nLa guía oficial (v1.0) tiene 30 task statements; los 37 objetivos del score report no aparecen textuales. El dominio de cada objetivo se infirió por contenido. Ver content/research/exam-guide.md.\n`;
writeFileSync(path.join(ROOT, "reports", "no-verificado.md"), nv);
console.log(`Reportes escritos en ${path.join(ROOT, "reports")}`);
