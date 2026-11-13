// Utilidades compartidas por los scripts de contenido (sin dependencias de Next).
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const ROOT = path.resolve(import.meta.dirname, "..", "content");
export const pad = (n: number) => String(n).padStart(2, "0");

export interface Q {
  id: string; objective: number; pool: string; scenario: string; options: string[]; correct: number;
  why_correct: string; why_wrong: Record<string, string>; rule: string; source_url: string; source_quote: string;
  status: string; verification: { date: string; verdict: string; notes: string } | null;
}
export interface Obj { id: number; text: string; domain: string; baseline: number; days: number[] }

export const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
export const objectives = () => readJson<Obj[]>("objectives.json");
export const domains = () => readJson<{ domains: { id: string; name: string; weight: number }[] }>("domains.json").domains;

export function questionFiles() {
  const dir = path.join(ROOT, "questions");
  return readdirSync(dir).filter((f) => /^obj-\d\d\.json$/.test(f)).sort().map((f) => ({
    file: path.join(dir, f),
    data: JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { objective: number; questions: Q[] },
  }));
}
export const allQuestions = () => questionFiles().flatMap((f) => f.data.questions);

export function doc(kind: "lessons" | "labs", o: number) {
  const f = path.join(ROOT, kind, `obj-${pad(o)}.md`);
  if (!existsSync(f)) return null;
  const m = matter(readFileSync(f, "utf8"));
  return { file: f, data: m.data as Record<string, unknown>, content: m.content };
}

export function sims() {
  const dir = path.join(ROOT, "sims");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^sim-\d+\.json$/.test(f)).sort()
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { id: number; questions: string[] });
}

export function writeJson(file: string, data: unknown) {
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

/** Dominios oficiales: los únicos hosts aceptados como fuente. */
export const OFFICIAL_HOSTS = [
  "code.claude.com", "docs.claude.com", "docs.anthropic.com", "platform.claude.com", "modelcontextprotocol.io",
  "anthropic.skilljar.com", "anthropic-partners.skilljar.com", "www.anthropic.com", "anthropic.com", "claude.com",
];
export const isOfficial = (url: string) => {
  try { return OFFICIAL_HOSTS.includes(new URL(url).host); } catch { return false; }
};
