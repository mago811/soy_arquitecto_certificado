import "server-only";
import { sql } from "./db";
import { getPlan, practiceQuestions, type Question } from "./content";
import { masteryFrom, type AnswerRow } from "./progress";

/**
 * Test de nivel: preguntas de práctica (verificadas) de los objetivos que el plan
 * ya dio hasta hoy. Antes de arrancar, Diego cuenta qué días hizo (autoevaluación);
 * el informe separa el resultado entre lo que marcó como estudiado y lo que no.
 */
export const DIAG_SIZE = 30;
export const DIAG_MINUTES = 60;

export type DayStatus = "completo" | "a_medias" | "no";
export const STATUS_LABEL: Record<DayStatus, string> = { completo: "Lo hice completo", a_medias: "A medias", no: "No lo hice" };

export interface DiagAttempt {
  id: number; started_at: string; finished_at: string | null; upto_day: number;
  questions: string[]; self_report: Record<string, DayStatus>; answers: Record<string, number>;
  score_pct: string | null; scaled: number | null;
}

const norm = (r: DiagAttempt) => ({ ...r, id: Number(r.id) });

export async function diagAttempts() {
  return ((await sql()`SELECT * FROM diag_attempts ORDER BY started_at DESC`) as DiagAttempt[]).map(norm);
}

export async function diagAttempt(id: number) {
  const rows = (await sql()`SELECT * FROM diag_attempts WHERE id = ${id}`) as DiagAttempt[];
  return rows[0] ? norm(rows[0]) : null;
}

/** Días ya transcurridos del plan (1..upTo) con sus objetivos, sin el día del examen. */
export function coveredDays(upTo: number) {
  return getPlan().days.filter((d) => d.day <= upTo && d.tasks.some((t) => t.type !== "text"));
}

/** Objetivo → primer día del plan en que aparece (dentro de lo transcurrido). */
export function objectiveFirstDay(upTo: number) {
  const m = new Map<number, number>();
  for (const d of coveredDays(upTo)) for (const t of d.tasks) if (t.objective != null && !m.has(t.objective)) m.set(t.objective, d.day);
  return m;
}

function shuffle<T>(a: T[]) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

/**
 * Una pregunta por objetivo visto; el resto (hasta DIAG_SIZE) va a los objetivos con
 * dominio más bajo. Se priorizan preguntas que Diego todavía no respondió nunca.
 */
export function pickDiagnostic(upTo: number, answers: Pick<AnswerRow, "question_id" | "objective" | "correct">[]) {
  const objs = [...objectiveFirstDay(upTo).keys()];
  const seen = new Set(answers.map((a) => a.question_id));
  const pool = new Map<number, Question[]>();
  for (const o of objs) {
    const qs = practiceQuestions(o);
    pool.set(o, [...shuffle(qs.filter((q) => !seen.has(q.id))), ...shuffle(qs.filter((q) => seen.has(q.id)))]);
  }
  const chosen: Question[] = [];
  for (const o of shuffle(objs)) { const q = pool.get(o)!.shift(); if (q) chosen.push(q); }
  const mastery = masteryFrom(answers).filter((m) => objs.includes(m.objective.id)).sort((a, b) => a.pct - b.pct);
  let guard = 0;
  while (chosen.length < Math.min(DIAG_SIZE, objs.length * 2) && guard++ < 200) {
    let added = false;
    for (const m of mastery) {
      if (chosen.length >= DIAG_SIZE) break;
      const q = pool.get(m.objective.id)!.shift();
      if (q) { chosen.push(q); added = true; }
    }
    if (!added) break;
  }
  return shuffle(chosen).map((q) => q.id);
}

export const diagDeadline = (startedAt: string) => new Date(new Date(startedAt).getTime() + DIAG_MINUTES * 60000);
