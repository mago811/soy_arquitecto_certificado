---
objective: 5
title: "Subagentes con rol acotado: tools, contexto y system prompt"
rule: "El rol se GARANTIZA con `tools`/`disallowedTools`; el contexto viaja SOLO en el prompt de delegación; el rol se describe en el system prompt, no en `description`."
sources:
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
status: verificada
---

## Qué es

Configurar un subagente es decidir tres cosas:

| Palanca | Dónde | Qué garantiza |
| :- | :- | :- |
| Herramientas | `tools` (allowlist) / `disallowedTools` (denylist) | Lo que el subagente **puede** hacer. Lo que no está, no existe en su sesión |
| Contexto | Prompt de delegación, `omitClaudeMd`, `mcpServers` inline | Qué **sabe** al arrancar |
| Rol | Cuerpo del markdown o `prompt` (SDK) | Cómo **se comporta** |

## Cuándo se usa

- **Reviewer de solo lectura:** `tools: Read, Grep, Glob`. Sin Edit, Write ni Bash. Una frase "no edites" en el prompt es guidance; la allowlist es enforcement.
- **Test runner que no debe pushear:** necesita Bash. Ojo: `disallowedTools: Bash(git push *)` saca **todo** Bash. Para bloquear solo el push, usá una regla `Bash(git push *)` en `permissions.deny` de settings.
- **Subagente con un MCP pesado:** definí el server **inline** en `mcpServers` del subagente. El subagente tiene las tools; la conversación principal no paga sus descripciones.
- **Subagente que vive del prompt:** `omitClaudeMd: true` para que arranque sin los CLAUDE.md de user/project/local.

## El error típico que el examen quiere que cometas

1. **Pensar que el subagente "sabe" lo que hablaste.** Arranca con contexto nuevo. Lo único que pasa del padre es el string del prompt del Agent tool. Rutas, errores y decisiones van **adentro** de ese prompt.
2. **Meter el rol en `description`.** `description` dice **cuándo** delegar. El rol y las reglas van en el cuerpo (system prompt), que solo se carga cuando el subagente corre.
3. **Confiar en el prompt para restringir.** Si el subagente no debe editar, sacale Edit/Write.
4. **Usar un `disallowedTools` con especificador** creyendo que es fino. Saca la herramienta entera.

## Ejemplo

Fintech Río tiene un `pr-reviewer` que a veces "arregla" el código que revisa. La definición:

```markdown
---
name: pr-reviewer
description: Revisor de PRs. Solo comenta, nunca modifica código. Usar después de cada cambio.
---
Revisá el diff y listá problemas.
```

Dos fallas: no tiene `tools` (hereda todo, incluido Edit) y la regla "nunca modifica" está en `description`. Fix:

```markdown
---
name: pr-reviewer
description: Revisa PRs. Usar después de cada cambio de código.
tools: Read, Grep, Glob
---
Sos revisor de PRs. Tu salida es una lista de hallazgos con archivo y línea.
No proponés parches.
```

Y el coordinador, al delegar, escribe: "Revisá `src/pagos/transfer.ts`; el test `transfer.spec.ts` falla con `TypeError: amount is undefined`".

## Para recordar

- `tools` = allowlist; omitido = hereda todo.
- `disallowedTools` con especificador saca la tool entera → para bloqueo fino, `permissions.deny`.
- Contexto: todo lo que necesita va en el prompt de delegación.
- Rol: en el system prompt. `description`: cuándo delegar, corto.
