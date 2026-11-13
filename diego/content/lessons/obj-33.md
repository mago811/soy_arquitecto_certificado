---
objective: 33
title: "Repartir herramientas: cada subagente con las tools de su rol"
rule: "Cada subagente recibe SOLO las tools de su rol (`tools` como allowlist, `disallowedTools` para sacar). Una tool que no está en su lista no existe para él: ni la puede elegir mal ni usarla fuera de rol."
sources:
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
    title: "Tool search tool"
status: no_verificado
---

## Qué es

En un sistema multi-agente, cada subagente tiene su propio contexto, su system prompt y **su propio set de tools**. Si no le decís nada, hereda todas las tools disponibles. Eso trae dos problemas:

1. **Elige peor.** La doc de la API: la capacidad de Claude de elegir la tool correcta "degrades once you exceed 30–50 available tools". Menos tools = menos ambigüedad.
2. **Hace cosas fuera de su rol.** Un "investigador" con `Write` y `Bash` puede terminar editando código.

La solución es repartir: cada rol, sus tools.

| Campo (archivo `.claude/agents/x.md` o `AgentDefinition` del SDK) | Cómo funciona | Cuándo |
|---|---|---|
| `tools` | **Allowlist**: solo estas. Si lo omitís, hereda todo | Rol acotado y conocido (revisor, test runner) |
| `disallowedTools` | **Denylist**: hereda todo menos estas | "Todo menos escribir archivos" |
| Ambos | Primero se aplica `disallowedTools`, después `tools` sobre lo que queda | Raro; si una tool está en los dos, queda afuera |
| `mcpServers` en el subagente | Server MCP que solo ve ese subagente | Tools pesadas que no querés en el contexto principal |

Combinaciones típicas de la doc del SDK:

| Rol | `tools` |
|---|---|
| Análisis de solo lectura | `Read`, `Grep`, `Glob` |
| Correr tests | `Bash`, `Read`, `Grep` |
| Modificar código | `Read`, `Edit`, `Write`, `Grep`, `Glob` |
| Acceso total | omitir `tools` |

## Cuándo se usa

- **Revisor de código** que nunca debe tocar archivos → `tools: Read, Grep, Glob`.
- **Agente de GitHub** → `tools: mcp__github__*` (todas las tools de ese server, nada más).
- **"Hereda todo, pero sin el server de GitHub"** → `disallowedTools: mcp__github`.
- **Un server MCP con 40 tools que solo usa un subagente** → declaralo en `mcpServers` de ese subagente, no en `.mcp.json`. La doc: "The subagent gets the tools; the parent conversation doesn't."
- **Coordinador** → lanza subagentes con la tool `Agent` (los ejemplos del SDK la incluyen en `allowedTools` del agente principal).

## El error típico que el examen quiere que cometas

- **"Decile en el prompt del subagente que no edite archivos."** Es guía. Si `Edit` está en su set, la puede usar. Sacala del set: lo que no está en la lista "isn't in the subagent's session at all".
- **Darle a todos los subagentes todas las tools "por las dudas".** Más tools = peor selección y más riesgo de llamadas fuera de rol.
- **Usar `disallowedTools: Bash(git push *)` para bloquear solo el push.** Saca **todo** `Bash` del subagente. Para bloquear solo ese comando: regla `Bash(git push *)` en `permissions.deny`.
- **Un mega-agente con 60 tools** en vez de especialistas. Repartí por rol.

## Ejemplo

Pipeline de investigación con tres subagentes (archivos en `.claude/agents/`):

```markdown
---
name: web-researcher
description: Busca y resume fuentes web. Usar para investigar temas externos.
tools: WebSearch, WebFetch
---
Buscá fuentes y devolvé un resumen con links.
```

```markdown
---
name: code-analyst
description: Analiza el código del repo sin modificarlo.
tools: Read, Grep, Glob
---
Analizá el código y reportá hallazgos con rutas y líneas.
```

```markdown
---
name: report-writer
description: Escribe el informe final en docs/.
tools: Read, Write
---
Redactá el informe con lo que te pasan.
```

El investigador web no puede leer el repo; el analista no puede escribir; el redactor no puede navegar. Cada uno elige entre 2 o 3 tools, no entre 40.

## Para recordar

- Omitir `tools` = hereda todo. Ponerlo = solo esas.
- `disallowedTools` saca del set heredado o especificado; con los dos, primero `disallowedTools`.
- Tool que no está en el set = no existe para ese subagente: sin prompt, sin error.
- MCP por server: `mcp__github__*` en `tools`; `mcp__github` o `mcp__*` en `disallowedTools`.
- Prompt = orienta. Lista de tools = garantiza.
