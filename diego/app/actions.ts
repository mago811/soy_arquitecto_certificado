"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { COOKIE, checkPassword, cookieOptions, createToken } from "@/lib/auth";
import { questionById, getSim } from "@/lib/content";
import { scheduleAfterAnswer, scoreSim, simAttempt, deadlineOf } from "@/lib/progress";

export async function login(_prev: string | null, form: FormData) {
  const pw = String(form.get("password") ?? "");
  if (!checkPassword(pw)) return "Contraseña incorrecta.";
  (await cookies()).set(COOKIE, await createToken(), cookieOptions);
  const next = String(form.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

/** Registra una respuesta de práctica o repaso. La corrección se hace en el servidor. */
export async function answerQuestion(questionId: string, chosen: number, mode: "practice" | "review") {
  const q = questionById(questionId);
  if (!q || q.status !== "verificada" || (q.pool !== "practice" && mode !== "review")) throw new Error("Pregunta inválida");
  const correct = chosen === q.correct;
  await sql()`INSERT INTO answers (question_id, objective, chosen, correct, mode)
              VALUES (${q.id}, ${q.objective}, ${chosen}, ${correct}, ${mode})`;
  await scheduleAfterAnswer(q.id, correct, mode);
  revalidatePath("/", "layout");
  return { correct };
}

export async function toggleTask(taskId: string, done: boolean) {
  if (done) await sql()`INSERT INTO plan_checks (task_id) VALUES (${taskId}) ON CONFLICT DO NOTHING`;
  else await sql()`DELETE FROM plan_checks WHERE task_id = ${taskId}`;
  revalidatePath("/", "layout");
}

export async function markRule(objective: number, reviewed: boolean) {
  if (reviewed) await sql()`INSERT INTO rule_reviews (objective) VALUES (${objective}) ON CONFLICT (objective) DO UPDATE SET reviewed_at = now()`;
  else await sql()`DELETE FROM rule_reviews WHERE objective = ${objective}`;
  revalidatePath("/", "layout");
}

export async function startSim(simId: number) {
  const sim = getSim(simId);
  if (!sim || sim.questions.length === 0) throw new Error("Simulacro no disponible");
  const open = (await sql()`SELECT id FROM sim_attempts WHERE sim_id = ${simId} AND finished_at IS NULL ORDER BY started_at DESC LIMIT 1`) as { id: string }[];
  const id = open[0]?.id ?? ((await sql()`INSERT INTO sim_attempts (sim_id) VALUES (${simId}) RETURNING id`) as { id: string }[])[0].id;
  redirect(`/simulacro/${simId}/intento/${id}`);
}

export async function saveSimAnswer(attemptId: number, questionId: string, chosen: number) {
  const a = await simAttempt(attemptId);
  if (!a || a.finished_at) return { ok: false };
  if (Date.now() > deadlineOf(a.started_at).getTime() + 30_000) return { ok: false };
  await sql()`UPDATE sim_attempts SET answers = answers || jsonb_build_object(${questionId}::text, ${chosen}::int) WHERE id = ${attemptId} AND finished_at IS NULL`;
  return { ok: true };
}

export async function finishSim(attemptId: number) {
  const a = await simAttempt(attemptId);
  if (!a) throw new Error("Intento inexistente");
  if (!a.finished_at) {
    const sim = getSim(a.sim_id)!;
    const s = scoreSim(sim.questions, a.answers);
    const done = (await sql()`UPDATE sim_attempts SET finished_at = now(), score_pct = ${s.pct}, scaled = ${s.scaled}
                  WHERE id = ${attemptId} AND finished_at IS NULL RETURNING id`) as unknown[];
    if (done.length) {
      for (const qid of sim.questions) {
        const q = questionById(qid)!;
        const chosen = a.answers[qid];
        const correct = chosen === q.correct;
        // Sin responder cuenta como error, con chosen = -1.
        await sql()`INSERT INTO answers (question_id, objective, chosen, correct, mode, sim_attempt_id)
                    VALUES (${qid}, ${q.objective}, ${chosen ?? -1}, ${correct}, 'sim', ${attemptId})`;
        if (!correct) await scheduleAfterAnswer(qid, false, "sim");
      }
    }
  }
  revalidatePath("/", "layout");
  redirect(`/simulacro/${a.sim_id}/informe/${attemptId}`);
}
