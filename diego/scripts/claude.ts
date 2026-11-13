// Cliente de Claude y utilidades compartidas por generate.ts y verify.ts.
// Necesita ANTHROPIC_API_KEY (o un perfil de `ant auth login`).
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";
export const client = new Anthropic();

/**
 * Llamada con salida estructurada (output_config.format + zod).
 * En Claude Opus 5.5 el tool_choice forzado ("any"/"tool") no está soportado,
 * así que usamos structured outputs: la respuesta valida contra el schema.
 */
export async function structured<T extends z.ZodTypeAny>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system,
    output_config: { effort: "high", format: zodOutputFormat(schema) },
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new Error(`El modelo rechazó la solicitud: ${res.stop_details?.explanation ?? ""}`);
  if (res.stop_reason === "max_tokens") throw new Error("Respuesta truncada por max_tokens: pedí menos ítems por llamada.");
  if (!res.parsed_output) throw new Error("No se pudo parsear la salida estructurada");
  return res.parsed_output as z.infer<T>;
}

/** Baja una página oficial. En code.claude.com usa la versión .md, que trae el texto limpio. */
export async function fetchDoc(url: string): Promise<string> {
  const u = new URL(url);
  const target = u.host === "code.claude.com" && !u.pathname.endsWith(".md") ? `${u.origin}${u.pathname}.md` : url;
  const r = await fetch(target, { redirect: "follow" });
  if (!r.ok) throw new Error(`${r.status} al bajar ${target}`);
  const text = await r.text();
  // Sacamos tags HTML si los hubiera, para no gastar tokens.
  return text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s{3,}/g, "\n\n");
}

export const QuestionOut = z.object({
  scenario: z.string(),
  options: z.array(z.string()),
  correct: z.number().int(),
  why_correct: z.string(),
  why_wrong: z.array(z.object({ option: z.number().int(), why: z.string() })),
  rule: z.string(),
  source_url: z.string(),
  source_quote: z.string(),
});
export type QuestionOut = z.infer<typeof QuestionOut>;
