import "server-only";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const ROOT = path.join(process.cwd(), "content");

export type DomainId = "d1" | "d2" | "d3" | "d4" | "d5";
export interface Domain { id: DomainId; name: string; weight: number }
export interface Objective {
  id: number; text: string; title: string; domain: DomainId; baseline: number; days: number[];
}
export interface Source { url: string; title?: string }
export interface Question {
  id: string; objective: number; pool: "practice" | "sim";
  scenario: string; options: string[]; correct: number;
  why_correct: string; why_wrong: Record<string, string>; rule: string;
  source_url: string; source_quote: string;
  status: "verificada" | "no_verificado" | "descartada";
  verification: { date: string; verdict: string; notes: string } | null;
}
export interface Doc {
  objective: number; title: string; rule?: string; minutes?: number; needs?: string[];
  sources: Source[]; status: string; html: string;
}
export interface PlanTask {
  id: string; type: "lesson" | "lab" | "practice" | "review" | "sim" | "errors" | "progress" | "rules" | "text";
  objective?: number; sim?: number; label: string;
}
export interface PlanDay { day: number; date: string; topic: string; objectives: number[]; tasks: PlanTask[] }
export interface Plan { exam_date: string; go_no_go_day: number; days: PlanDay[] }

const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
const pad = (n: number) => String(n).padStart(2, "0");

let cache: {
  objectives: Objective[]; domains: Domain[]; plan: Plan; questions: Question[];
} | null = null;

function load() {
  if (cache) return cache;
  const objectives = readJson<Objective[]>("objectives.json");
  const domains = readJson<{ domains: Domain[] }>("domains.json").domains;
  const plan = readJson<Plan>("plan.json");
  const qdir = path.join(ROOT, "questions");
  const questions: Question[] = [];
  for (const f of readdirSync(qdir).filter((f) => f.endsWith(".json")).sort()) {
    const data = JSON.parse(readFileSync(path.join(qdir, f), "utf8")) as { questions: Question[] };
    questions.push(...data.questions);
  }
  cache = { objectives, domains, plan, questions };
  return cache;
}

export const getObjectives = () => load().objectives;
export const getDomains = () => load().domains;
export const getPlan = () => load().plan;
export const getObjective = (id: number) => load().objectives.find((o) => o.id === id);

/** Solo preguntas verificadas entran en la app. */
export const verifiedQuestions = () => load().questions.filter((q) => q.status === "verificada");
export const allQuestions = () => load().questions;
export const practiceQuestions = (objective?: number) =>
  verifiedQuestions().filter((q) => q.pool === "practice" && (objective == null || q.objective === objective));
export const questionById = (id: string) => load().questions.find((q) => q.id === id);

function readDoc(kind: "lessons" | "labs", objective: number): Doc | null {
  const file = path.join(ROOT, kind, `obj-${pad(objective)}.md`);
  if (!existsSync(file)) return null;
  const { data, content } = matter(readFileSync(file, "utf8"));
  return {
    objective,
    title: data.title ?? "",
    rule: data.rule,
    minutes: data.minutes,
    needs: data.needs,
    sources: data.sources ?? [],
    status: data.status ?? "no_verificado",
    html: marked.parse(content, { async: false }) as string,
  };
}
export const getLesson = (o: number) => readDoc("lessons", o);
export const getLab = (o: number) => readDoc("labs", o);

/** Título corto en español: el de la lección si existe, si no el del objetivo. */
export function objectiveTitle(o: Objective) {
  return o.title || getLesson(o.id)?.title || o.text;
}

/** Regla de bolsillo de cada objetivo (solo lecciones verificadas). */
export function pocketRules() {
  return load().objectives.map((o) => {
    const l = getLesson(o.id);
    return { objective: o, rule: l && l.status === "verificada" ? l.rule ?? null : null };
  });
}

export interface SimDef { id: number; questions: string[] }
export function getSim(id: number): SimDef | null {
  const file = path.join(ROOT, "sims", `sim-${id}.json`);
  if (!existsSync(file)) return null;
  const sim = JSON.parse(readFileSync(file, "utf8")) as SimDef;
  const ok = new Set(verifiedQuestions().map((q) => q.id));
  return { id: sim.id, questions: sim.questions.filter((q) => ok.has(q)) };
}

/** Tamaño mínimo para habilitar un simulacro. Se puede bajar en local para probar (SIM_SIZE=5). */
export const SIM_SIZE = Number(process.env.SIM_SIZE ?? 60);
