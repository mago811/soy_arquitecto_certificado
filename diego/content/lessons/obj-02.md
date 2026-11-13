---
objective: 2
title: "Retomar una sesión sin repetir trabajo (y sin creerle a datos viejos)"
rule: "Contexto mayormente válido → resume y avisale QUÉ archivos cambiaron; contexto viejo → sesión nueva con un resumen estructurado; otra alternativa desde la misma base → fork."
sources:
  - url: https://code.claude.com/docs/en/sessions
    title: "Manage sessions"
  - url: https://code.claude.com/docs/en/agent-sdk/sessions
    title: "Work with sessions (Agent SDK)"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (Task Statement 1.7)"
status: verificada
---

## Qué es

Una **sesión** es el historial de la conversación: tu prompt, cada tool call, cada tool result y cada respuesta. Retomarla significa que el agente vuelve con todo eso en contexto: "files it already read, analysis it already performed, decisions it already made".

Ojo con lo que NO guarda: "Sessions persist the conversation, not the filesystem". Si alguien cambió un archivo después, el agente sigue "recordando" la versión vieja. Ese es el corazón del tema.

| Querés… | Claude Code | Agent SDK |
|---|---|---|
| La sesión más reciente de esta carpeta | `claude --continue` | `continue_conversation=True` (Py) / `continue: true` (TS) |
| Una sesión puntual | `claude --resume <nombre o id>` · `/resume` adentro | `resume=session_id` |
| Ponerle nombre | `claude -n auth-audit` · `/rename auth-audit` | (guardás el `session_id` del result) |
| Probar otro camino sin tocar el original | `/branch` · `--resume ... --fork-session` | `resume=...` + `fork_session=True` (TS: `forkSession: true`) |

## Cuándo se usa

Tres situaciones, tres respuestas:

1. **El análisis previo sigue casi todo válido, cambiaron pocos archivos.** Resume y en el primer prompt decile *cuáles* cambiaron: "Desde ayer cambiaron `auth/token.ts` y `auth/session.ts` (te pego el `git diff`). Releé solo esos dos y actualizá tu análisis". Eso es **re-análisis dirigido**: no repite la exploración entera, y no confía en lecturas viejas.
2. **El código cambió mucho (refactor grande, semanas).** Los tool results de la sesión vieja ya no sirven: son ruido que confunde. Sesión nueva + **inyección de contexto**: un resumen estructurado (decisiones, pendientes, archivos clave) o archivos de estado (`progress.txt`, `tests.json`, git log). La doc de prompting: "Claude’s latest models are extremely effective at discovering state from the local filesystem."
3. **Querés comparar dos enfoques desde el mismo análisis.** Fork. El fork "starts with a copy of the original's history but diverges from that point" y tiene su propio ID. El original queda intacto.

Con el SDK en hosts efímeros, igual: "Capture the results you need (analysis output, decisions, file diffs) as application state and pass them into a fresh session's prompt."

## El error típico que el examen quiere que cometas

- **"Hacé `--continue`"** cuando el usuario tiene varias sesiones: `--continue` abre *la más reciente*, no la que querés. Para una puntual: `--resume <nombre>`.
- **"Resume y listo"** después de que cambió el código: el agente razona sobre lecturas viejas. Falta avisarle qué cambió.
- **"Empezá de cero y que explore todo"** cuando cambiaron 2 archivos: funciona, pero repite trabajo.
- **"Fork para ver los cambios nuevos"**: el fork copia el mismo historial viejo. No refresca nada.
- **Creer que el fork aísla archivos**: "Forking branches the conversation history, not the filesystem." Si las dos ramas editan, se pisan.
- **Retomar la misma sesión en dos terminales sin fork**: "messages from both interleave into one transcript".

## Ejemplo

Lunes: `claude -n pagos-audit`, Claude analiza el módulo de pagos. Martes: un compañero mergea un cambio en `pagos/refund.ts`.

```bash
claude --resume pagos-audit
```

Primer mensaje:

```text
Desde ayer cambió solo pagos/refund.ts (git diff main~1 -- pagos/refund.ts).
Releé ese archivo, decime qué conclusiones de ayer siguen válidas y cuáles no.
No vuelvas a leer el resto del módulo.
```

¿Y si quiere probar dos refactors? `claude --resume pagos-audit --fork-session` en una terminal para la alternativa B; la sesión original sigue con la A.

## Para recordar

- La sesión guarda conversación, no archivos. Archivo cambiado = lectura vieja en contexto.
- Pocos cambios → resume + lista de archivos cambiados (re-análisis dirigido).
- Muchos cambios → sesión nueva + resumen estructurado.
- `--continue` = la última. `--resume <nombre>` = una puntual. Fork = rama nueva con su propio ID.
