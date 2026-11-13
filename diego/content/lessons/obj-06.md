---
objective: 6
title: "Diagnosticar subagentes que no arrancan"
rule: "Subagente que no corre: revisá 3 cables — el coordinador tiene `Agent` disponible, la `AgentDefinition` es válida (`description`+`prompt`, `tools` reales) y la definición llega a la sesión."
sources:
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://code.claude.com/docs/en/agent-sdk/python
    title: "Agent SDK reference - Python"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/errors
    title: "Error reference"
status: verificada
---

## Qué es

En el Claude Agent SDK definís subagentes con `agents` en las opciones de `query()`. Cada uno es una `AgentDefinition`:

| Campo | ¿Obligatorio? | Para qué |
| :- | :- | :- |
| `description` | Sí | Cuándo delegarle |
| `prompt` | Sí | Su system prompt |
| `tools` | No | Allowlist. Si falta, hereda todo lo disponible para subagentes |
| `disallowedTools`, `model`, `skills`, `mcpServers`, `maxTurns`, `permissionMode`… | No | Ajustes |

El coordinador lanza subagentes **con la herramienta `Agent`** (antes se llamaba `Task`; `Task` sigue como alias y así aparece en `system:init`).

## Cuándo se usa

Cuando "el subagente nunca corre", el examen te da síntomas. Pensalo como tres cables:

**Cable 1 — el coordinador tiene `Agent` disponible.**
- `allowedTools` **auto-aprueba**, no restringe. Y `Agent` no necesita aprobación: corre aunque no esté en `allowedTools`, incluso en `dontAsk` (la doc lo nombra entre las "calls that need no approval"). Los ejemplos oficiales igual lo listan en `allowedTools`.
- `disallowedTools: ["Agent"]` (nombre pelado) saca la herramienta del contexto de Claude: ahí sí no hay delegación.
- Con `claude --agent coord` y `tools: Agent(worker)`, solo puede lanzar `worker`. Si omitís `Agent` de `tools`, no lanza ninguno.

**Cable 2 — la `AgentDefinition` es válida.**
- Falta `description` o `prompt` → son obligatorios.
- En Python, los campos van en **camelCase** (`disallowedTools`, `maxTurns`). `disallowed_tools=` tira `TypeError` al construir.
- `tools` con un typo (`"Grpe"`) → `Agent '…' would be spawned with zero tools — refusing`.
- `tools` del subagente ≠ `allowedTools` del coordinador. Poner `Agent` en el subagente no arregla al coordinador.

**Cable 3 — la definición llega a la sesión.**
- `settingSources: []` → no se cargan los agentes de `.claude/agents/`.
- Archivo con `name` pero sin `description` → se saltea (sale en el debug log).
- Carpeta `agents` creada a mitad de sesión → hace falta reiniciar.
- Un agente en `agents` de `query()` pisa a uno de archivo con el mismo nombre.

## El error típico que el examen quiere que cometas

- "Agregar `Agent` a los `tools` del subagente" cuando el que no puede lanzar es el **coordinador**.
- "Subir `maxTurns`" o "cambiar el `model`" cuando el problema es de cableado.
- "Escribir en el prompt: SIEMPRE delegá" cuando la herramienta está bloqueada (guidance no arregla un bloqueo).
- Monitorear solo `block.name == "Task"`: hoy los `tool_use` se llaman `"Agent"`. Matcheá los dos.

## Ejemplo

```python
options = ClaudeAgentOptions(
    permission_mode="dontAsk",
    allowed_tools=["Read", "Grep", "Glob", "Agent"],
    disallowed_tools=["Agent"],                  # ← saca la herramienta de delegar
    agents={
        "auditor": AgentDefinition(
            description="Audita SQL en busca de writes",
            prompt="Sos un auditor de SQL de solo lectura...",
            tools=["Read", "Grpe"],              # ← typo
            max_turns=5,                         # ← snake_case: TypeError
        )
    },
)
```

Tres fallas, tres fixes: sacar `"Agent"` de `disallowed_tools`, `"Grep"`, y `maxTurns=5`. Ojo: el `dontAsk` no es el problema; `Agent` no pide aprobación.

## Para recordar

- Coordinador sin `Agent` disponible (por ejemplo, `disallowedTools`) = no hay subagentes. `dontAsk` solo no lo bloquea.
- `description` + `prompt` obligatorios; Python en camelCase.
- `tools` con nombres reales o "zero tools".
- Si la definición no llega (settingSources, archivo salteado, carpeta nueva), no hay nada que lanzar.
