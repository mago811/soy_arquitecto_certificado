# Análisis del mock externo — 18/8/2026

Fuente: claudecertificationguide.com/mock-exam (28 preguntas, terceros — no es
el examen oficial). Resultado: **696/1000, 19/28 (68%)**. Pass mark 720.

## 1. Aritmética: está a UNA pregunta

Pesos por dominio deducidos de los puntos reportados (suman 100%, validado):

| Dominio | Resultado | Peso | Aporte |
|---|---|---|---|
| D1 Agentic Architecture & Orchestration | 5/6 (83%) | 27% | 225 |
| D2 Tool Design & MCP Integration        | 4/5 (80%) | 18% | 144 |
| D3 Claude Code Configuration & Workflows| 4/6 (67%) | 20% | 133 |
| D4 Prompt Engineering & Structured Output| 4/6 (67%)| 20% | 133 |
| D5 Context Management & Reliability     | 2/5 (40%) | 15% |  60 |

Con **una** respuesta más correcta en CUALQUIER dominio el score va a 725–740:
aprueba en los cinco casos. El 696 no es una meseta, es varianza sobre una
muestra de 28.

Caveat: los pesos son de este mock de terceros; los del examen oficial pueden
diferir. Lo que NO depende de los pesos es el análisis de errores de abajo.

## 2. Progreso real vs. primer intento

Primer intento: 592, con seis objetivos en 0% (enforcement, mcp-scoping,
context-methods, api-stateless, extraction-schemas, tool-choice). Esos objetivos
viven en D1 y D2, hoy al 83% y 80%. **Las zonas rojas originales están cerradas.**
El score total no lo refleja porque se destapó un agujero nuevo.

## 3. BUG DEL PLAN: el semáforo miente sobre D5

`data/plan.json > objetivos` tiene:

    context-mgmt | Context management | zonaInicial: verde | baseline: 100

Por eso el plan no le dedicó ningún día y el simulacro #1 le asignó 3 de 60
preguntas. El mock lo mide en **40%**. Es el objetivo peor rankeado y estaba
etiquetado como fortaleza desde el día 1.

Además, el vocabulario que el mock evalúa en D5 no existe en ningún brief:
lost-in-the-middle, progressive summarisation trap, persistent facts block,
claim-source mapping / information provenance, session context isolation.

## 4. Los 9 errores son 3 patrones

### Patrón A — fix por instrucción en vez de fix estructural (4/9)
- Q28 (D5, facts-block): eligió "instruir al agente a incluir siempre cifras
  exactas" en vez de extraer los números a un facts block persistente.
- Q25 (D4, false-positives): eligió agregar "only report high-confidence" al
  system prompt en vez de desactivar la categoría y refinar con criterios explícitos.
- Q06 (D4, few-shot): eligió los ejemplos sin cobertura de edge cases.
- Q26 (D3, hooks): eligió PreToolUse que bloquea hasta que el archivo esté
  linteado — imposible, el archivo aún no existe. Era PostToolUse.

### Patrón B — plumbing/infra cuando el pipeline ya entrega output (3/9)
- Q11 (D3, session-isolation): eligió "falta el flag -p" en vez de contexto de
  sesión compartido entre los tres pasos.
- Q02 (D1, parallel-spawning): eligió `fork_session` en vez de emitir dos Task
  calls en una sola respuesta.
- Q07 (D5, provenance): eligió una base de datos con referencias por ID en vez
  de claim-source mappings estructurados.

### Patrón C — vocabulario no estudiado (2/9)
- Q18 (D5): eligió anchoring bias; era lost-in-the-middle.
- Q20 (D2): taxonomía transient / validation / business + isRetryable.

**6 de 9 errores (A+B) son la MISMA equivocación.** No son seis temas a estudiar.

## 5. Principio de oro 7 propuesto (a validar con Mago)

El principio 6 vigente ("en Claude Code: guidance orienta, enforcement
garantiza") está internalizado dentro de Claude Code, pero no se generaliza a
D4/D5. Versión general:

> **7. Si el sistema YA produce output y el output es malo, el fix nunca es un
> flag, un formato, más infraestructura ni "decirle al modelo que se porte
> bien". Es cambiar QUÉ dato viaja o QUÉ contexto ve.**
>
> **7b. Si una opción invoca un mecanismo que suena avanzado, verificá que el
> mecanismo haga literalmente lo que la opción dice.** `fork_session` es para
> exploración divergente, no para spawnear subagentes en paralelo. No se puede
> lintear un archivo que todavía no fue escrito.

Aplicando 7 y 7b a este mock se recuperan 6 de las 9 preguntas.

## 6. Recomendación para los días que quedan (16→21)

El plan NO necesita reprogramarse; solo hay que definir qué significa "los 2
peores objetivos" del día 17:

- **Día 16 (hoy, 18/8):** crash de D5 — vocabulario de fallas de contexto + drill
  del principio 7 sobre los 9 errores de este mock.
- **Día 17 (19/8):** segunda vuelta = (a) D5 context/reliability, (b) el patrón
  transversal estructura-vs-instrucción. No son los 2 objetivos que dice el semáforo.
- **Día 18 (20/8):** simulacro #2 — debe sobreponderar D5 (hoy 3/60).
- **Días 19–21:** sin cambios.
