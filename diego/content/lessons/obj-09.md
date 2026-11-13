---
objective: 9
title: "Retomar un pipeline multiagente sin repetir ni perder trabajo"
rule: "Cada etapa guarda su resultado en un lugar conocido y un manifiesto dice qué está hecho; al retomar, el coordinador lee el manifiesto, saltea lo hecho e inyecta los hallazgos. Las sesiones (`resume`, `fork_session`) guardan la conversación, no los archivos."
sources:
  - url: https://code.claude.com/docs/en/agent-sdk/sessions
    title: "Work with sessions"
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://code.claude.com/docs/en/agent-sdk/file-checkpointing
    title: "Rewind file changes with checkpointing"
  - url: https://code.claude.com/docs/en/sessions
    title: "Manage sessions (Claude Code)"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (PDF linkeado desde esta página), Task Statements 1.7 y 5.4"
status: verificada
---

## Qué es

Un pipeline multiagente corre largo. Se cae la red, se corta el proceso, se acaba el presupuesto. Anthropic lo cuenta así: "we can't just restart from the beginning: restarts are expensive and frustrating for users. Instead, we built systems that can resume from where the agent was". Para eso tenés dos capas:

**1. Estado de la aplicación (lo tuyo).** La guía del examen describe el patrón: cada agente exporta su estado a un lugar conocido y el coordinador carga un **manifiesto** al retomar, y lo inyecta en los prompts. Ejemplo: `state/manifest.json` con `{ "etapa": "busqueda", "status": "done", "output": "state/busqueda.json" }`.

**2. Sesiones del Agent SDK (la conversación).**

| Necesidad | Qué usás |
|---|---|
| Seguir la sesión más reciente del directorio | `continue_conversation=True` (Python) / `continue: true` (TS) |
| Volver a UNA sesión específica (varios jobs o usuarios) | Guardar `session_id` y pasar `resume` |
| Probar otro camino sin tocar el original | `resume` + `fork_session=True` (TS: `forkSession`) |
| Retomar en otra máquina o en serverless | Adaptador `session_store` / `sessionStore`, o no depender del resume |
| Volver atrás cambios en archivos | File checkpointing (`enable_file_checkpointing`, `rewind_files()`) |

Detalles que el examen ama:

- El `session_id` está en el result message "regardless of success or error". Si terminó en `error_max_turns`, lo retomás con un límite más alto en vez de arrancar de cero.
- **Las sesiones guardan la conversación, no el filesystem.** Un fork que edita archivos los edita de verdad, para todos.
- File checkpointing rebobina archivos pero **no** la conversación, y no rastrea ediciones de subagentes.
- Los archivos de sesión son locales a la máquina.
- En Claude Code, una tool que estaba corriendo cuando se cayó el proceso **no se re-ejecuta** al retomar.

## Cuándo se usa

- **Crash a mitad de un pipeline de 6 etapas** → manifiesto: saltear las etapas `done` y pasarle al resto sus resultados.
- **Mismo job, retomar al otro día** → `resume` con el `session_id` guardado (en la CLI, `/rename` y `claude --resume <nombre>`).
- **El código cambió desde la última vez** → mejor una sesión nueva con un resumen estructurado que un resume con resultados de tools viejos. La doc del SDK: capturar resultados como estado de la aplicación y pasarlos a una sesión nueva "is often more robust than shipping transcript files around".
- **Comparar dos estrategias desde el mismo análisis** → fork.

## El error típico que el examen quiere que cometas

- "Usá `continue: true`" en un servidor con muchos jobs: retoma **la más reciente**, no la tuya. Va `resume` con el ID.
- "Forkeá para no pisar archivos": el fork separa la conversación, no el disco.
- "Guardá todo el progreso en un `progress.txt` libre": el estado de tareas va en JSON (la doc: "use JSON or other structured formats"); la prosa queda para notas.
- "Al reiniciar, que el coordinador vuelva a correr todo para estar seguro": es justo lo que el objetivo quiere evitar.

## Ejemplo

Pipeline de auditoría: `inventario → análisis por módulo (8 subagentes) → síntesis`. Se corta en el módulo 6.

Manifiesto al momento del corte:

```json
{
  "run_id": "audit-2026-11-20",
  "etapas": {
    "inventario": { "status": "done", "output": "state/inventario.json" },
    "modulo-auth": { "status": "done", "output": "state/modulo-auth.json" },
    "modulo-pagos": { "status": "in_progress", "session_id": "5b3f2c1a-..." },
    "sintesis": { "status": "pending" }
  }
}
```

Al relanzar, el coordinador lee el manifiesto: no repite `inventario` ni `modulo-auth`, retoma `modulo-pagos` con `resume` (o lo relanza si el código cambió), y a la síntesis le pasa el contenido de cada `state/*.json` en el prompt.

## Para recordar

- Manifiesto + estado por agente en ubicación conocida = retomar sin repetir.
- `resume` = una sesión exacta (guardá el ID). `continue` = la más reciente. `fork_session` = rama nueva, original intacto.
- Sesión ≠ archivos. Para archivos: git o file checkpointing.
- Datos stale → sesión nueva + resumen estructurado inyectado.
- Estado de tareas en JSON; notas en texto libre; git para checkpoints.
