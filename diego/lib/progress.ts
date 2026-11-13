import "server-only";
import { sql } from "./db";
import { getObjectives, getDomains, questionById, type DomainId, type Question } from "./content";
import { TZ, todayISO, addDays, diffDays, PLAN_START } from "./dates";

/** El baseline del score report pesa como 3 respuestas "virtuales". */
const PRIOR = 3;

export interface AnswerRow {
  question_id: string; objective: number; chosen: number; correct: boolean;
  mode: "practice" | "review" | "sim"; sim_attempt_id: number | null; day: string; answered_at: string;
}

export async function allAnswers(): Promise<AnswerRow[]> {
  return (await sql()`
    SELECT question_id, objective, chosen, correct, mode, sim_attempt_id,
           to_char(answered_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day, answered_at
    FROM answers ORDER BY answered_at`) as AnswerRow[];
}

export function masteryFrom(answers: Pick<AnswerRow, "objective" | "correct">[]) {
  const objs = getObjectives();
  const agg = new Map<number, { n: number; ok: number }>();
  for (const a of answers) {
    const m = agg.get(a.objective) ?? { n: 0, ok: 0 };
    m.n++; if (a.correct) m.ok++;
    agg.set(a.objective, m);
  }
  return objs.map((o) => {
    const m = agg.get(o.id) ?? { n: 0, ok: 0 };
    const pct = ((o.baseline / 100) * PRIOR + m.ok) / (PRIOR + m.n) * 100;
    return { objective: o, baseline: o.baseline, attempts: m.n, correct: m.ok, pct: Math.round(pct) };
  });
}

export function domainMastery(rows: ReturnType<typeof masteryFrom>) {
  return getDomains().map((d) => {
    const r = rows.filter((x) => x.objective.domain === d.id);
    const pct = r.length ? Math.round(r.reduce((s, x) => s + x.pct, 0) / r.length) : 0;
    return { domain: d, pct };
  });
}

/** Promedio de dominio de los 37 objetivos al cierre de cada día. */
export function dailyEvolution(answers: AnswerRow[]) {
  const today = todayISO();
  const first = answers[0]?.day && answers[0].day < PLAN_START ? answers[0].day : PLAN_START;
  const out: { day: string; avg: number; answered: number }[] = [];
  const base = masteryFrom([]);
  out.push({ day: "Base", avg: Math.round(base.reduce((s, x) => s + x.pct, 0) / base.length), answered: 0 });
  const end = today < PLAN_START ? PLAN_START : today;
  for (let d = first; diffDays(d, end) >= 0; d = addDays(d, 1)) {
    const upTo = answers.filter((a) => a.day <= d);
    const m = masteryFrom(upTo);
    out.push({ day: d.slice(8, 10) + "/" + d.slice(5, 7), avg: Math.round(m.reduce((s, x) => s + x.pct, 0) / m.length), answered: answers.filter((a) => a.day === d).length });
  }
  return out;
}

// ---------- repetición espaciada ----------
// Fallo → vuelve a +1 día (step 0). Acierto en repaso: step 0 → +2 (día 3), step 1 → +4 (día 7), step 2 → sale.
const NEXT_GAP = [2, 4];

export async function scheduleAfterAnswer(questionId: string, correct: boolean, mode: AnswerRow["mode"]) {
  const today = todayISO();
  const db = sql();
  if (!correct) {
    await db`INSERT INTO srs (question_id, step, due_on) VALUES (${questionId}, 0, ${addDays(today, 1)})
             ON CONFLICT (question_id) DO UPDATE SET step = 0, due_on = EXCLUDED.due_on`;
    return;
  }
  if (mode !== "review") return;
  const rows = (await db`SELECT step FROM srs WHERE question_id = ${questionId}`) as { step: number }[];
  if (!rows.length) return;
  const step = rows[0].step;
  if (step >= NEXT_GAP.length) await db`DELETE FROM srs WHERE question_id = ${questionId}`;
  else await db`UPDATE srs SET step = ${step + 1}, due_on = ${addDays(today, NEXT_GAP[step])} WHERE question_id = ${questionId}`;
}

export async function dueReviews() {
  const rows = (await sql()`SELECT question_id, step, to_char(due_on,'YYYY-MM-DD') AS due_on FROM srs WHERE due_on <= ${todayISO()} ORDER BY due_on`) as { question_id: string; step: number; due_on: string }[];
  return rows.map((r) => ({ ...r, q: questionById(r.question_id) })).filter((r): r is typeof r & { q: Question } => !!r.q && r.q.status === "verificada");
}

export async function pendingReviewCount() {
  const rows = (await sql()`SELECT count(*)::int AS n FROM srs`) as { n: number }[];
  return rows[0].n;
}

// ---------- plan / reglas ----------
export async function planChecks() {
  const rows = (await sql()`SELECT task_id FROM plan_checks`) as { task_id: string }[];
  return new Set(rows.map((r) => r.task_id));
}

export async function ruleReviews() {
  const rows = (await sql()`SELECT objective FROM rule_reviews`) as { objective: number }[];
  return new Set(rows.map((r) => r.objective));
}

// ---------- simulacros ----------
export interface SimAttempt {
  id: number; sim_id: number; started_at: string; finished_at: string | null;
  answers: Record<string, number>; score_pct: string | null; scaled: number | null;
}

export async function simAttempts(simId?: number) {
  const rows = (simId == null
    ? await sql()`SELECT * FROM sim_attempts ORDER BY started_at DESC`
    : await sql()`SELECT * FROM sim_attempts WHERE sim_id = ${simId} ORDER BY started_at DESC`) as SimAttempt[];
  return rows.map((r) => ({ ...r, id: Number(r.id) }));
}

export async function simAttempt(id: number) {
  const rows = (await sql()`SELECT * FROM sim_attempts WHERE id = ${id}`) as SimAttempt[];
  return rows[0] ? { ...rows[0], id: Number(rows[0].id) } : null;
}

export function scoreSim(questionIds: string[], answers: Record<string, number>) {
  const objs = getObjectives();
  const perObj = new Map<number, { n: number; ok: number }>();
  const perDom = new Map<DomainId, { n: number; ok: number }>();
  let ok = 0;
  for (const id of questionIds) {
    const q = questionById(id);
    if (!q) continue;
    const dom = objs.find((o) => o.id === q.objective)!.domain;
    const good = answers[id] === q.correct;
    if (good) ok++;
    const a = perObj.get(q.objective) ?? { n: 0, ok: 0 }; a.n++; if (good) a.ok++; perObj.set(q.objective, a);
    const b = perDom.get(dom) ?? { n: 0, ok: 0 }; b.n++; if (good) b.ok++; perDom.set(dom, b);
  }
  const total = questionIds.length;
  const pct = total ? ok / total : 0;
  return {
    correct: ok, total, pct: Math.round(pct * 100),
    /** Estimación lineal 100–1000. NO es la escala oficial. */
    scaled: Math.round(100 + 900 * pct),
    perObjective: [...perObj.entries()].sort((a, b) => a[0] - b[0]).map(([o, v]) => ({ objective: objs.find((x) => x.id === o)!, ...v, pct: Math.round((v.ok / v.n) * 100) })),
    perDomain: getDomains().map((d) => { const v = perDom.get(d.id) ?? { n: 0, ok: 0 }; return { domain: d, ...v, pct: v.n ? Math.round((v.ok / v.n) * 100) : null }; }),
  };
}

export const SIM_MINUTES = 120;
export const deadlineOf = (startedAt: string) => new Date(new Date(startedAt).getTime() + SIM_MINUTES * 60000);
