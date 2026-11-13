---
objective: 14
title: "`context: fork`: correr una skill en un subagente aislado"
rule: "Si la skill es una TAREA que ensucia el contexto, `context: fork` (+ `agent`). Si es conocimiento de referencia o necesita la charla previa, NO."
sources:
  - url: https://code.claude.com/docs/en/skills
    title: "Extend Claude with skills"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
status: verificada
---

## Qué es

Una skill es un `SKILL.md` (o un archivo en `.claude/commands/`, que hoy es lo mismo: los slash commands se fusionaron con las skills). Por defecto, cuando la invocás, su contenido entra **en tu conversación**. Todo lo que haga (búsquedas, archivos leídos, logs) queda en tu contexto.

Con `context: fork` en el frontmatter, Claude Code **arranca un subagente nuevo** y le pasa el contenido de la skill como prompt. El subagente trabaja en su propia ventana de contexto y te devuelve solo el resultado.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---
Research $ARGUMENTS thoroughly: ...
```

Campos que van juntos:

| Campo | Qué hace |
| :- | :- |
| `context: fork` | Corre la skill en un subagente aislado |
| `agent` | Qué tipo de subagente (`Explore`, `Plan`, `general-purpose` o uno tuyo de `.claude/agents/`). Si falta: `general-purpose` |
| `background` | Solo con fork. Default `true`. `false` = esperar el resultado en el mismo turno |
| `model` / `effort` | Con fork, se aplican al subagente, no a tu sesión |

## Cuándo se usa

- La skill es una **tarea con pasos explícitos** (auditar, investigar, resumir un PR) que genera mucho ruido.
- Querés que ese ruido **no contamine** tu sesión: el estado intermedio queda en el subagente.
- Querés controlar herramientas y modelo: el `agent` define "model, tools, and permissions".

## El error típico que el examen quiere que cometas

1. **Forkear una skill de referencia.** Si la skill dice "usá estas convenciones de API" sin tarea, el subagente recibe guías pero no tiene nada que hacer y vuelve sin resultado útil. Las skills de referencia corren **inline**.
2. **Creer que el fork ve la charla.** No la ve. "The subagent doesn't see your conversation history". Si la tarea depende de lo que hablaste, usá un fork de la conversación (`/subtask`) o corré la skill inline.
3. **Creer que `allowed-tools` restringe.** No restringe: solo **pre-aprueba** herramientas durante ese turno. Para limitar herramientas del fork, apuntá `agent` a un subagente con `tools` restringidos.
4. **Esperar que `agent: Explore` respete tu CLAUDE.md.** Explore y Plan arrancan **sin** CLAUDE.md. Lo que la tarea necesite, escribilo en el SKILL.md.
5. **Romper el frontmatter.** Si el `---` de apertura no es la primera línea, Claude Code toma todo como contenido y `context: fork` se ignora. Un nombre de campo mal escrito también se ignora sin error.

## Ejemplo

Logística Andina tiene `/auditar-deps`: lee 300 `package.json`, corre `npm ls` y arma un informe. Hoy corre inline: después de usarla, Claude arrastra cientos de líneas de dependencias y empieza a mezclar versiones en otras respuestas.

Fix:

```yaml
---
name: auditar-deps
description: Audita dependencias y reporta versiones vulnerables
context: fork
agent: Explore
background: false
---
1. Encontrá todos los package.json con Glob.
2. ...
3. Devolvé SOLO una tabla: paquete, versión, problema.
```

Ahora el trabajo pesado vive en el subagente y a tu sesión llega solo la tabla. `background: false` porque querés la tabla antes de seguir.

## Para recordar

- `context: fork` = **aislar una tarea**, no "copiar la conversación".
- Sin `agent` → `general-purpose`.
- El fork **no ve** tu historial; Explore/Plan **no ven** CLAUDE.md.
- `allowed-tools` pre-aprueba, **no** limita.
- Skill de referencia → inline. Skill de tarea ruidosa → fork.
