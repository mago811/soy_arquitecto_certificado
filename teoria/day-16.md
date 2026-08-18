---
dia: 16
titulo: Context Management & Reliability + el principio 7
duracion: 2h
---

## 📱 Pregunta de apertura · 5 min

**Un agente triangula incidentes leyendo logs de firewall OT. Para no llenar el contexto, resume los hallazgos entre rondas. Tras cuatro rondas reporta "se modificaron varias reglas de salida en la ventana" pero no puede decir CUÁLES: los rule IDs (`OUT-4471`, `OUT-4489`) se perdieron en los resúmenes. El SOC necesita los IDs. ¿Cuál es el fix?**

- A) Volver a correr la consulta original sobre los logs para recuperar los IDs
- B) Extraer los rule IDs a un bloque de hechos persistente, fuera del historial que se resume
- C) Instruirle al agente que sus resúmenes incluyan siempre los identificadores textuales
- D) Pasar a un modelo con ventana más grande para que resuma con menos frecuencia

Elegí antes de seguir. La respuesta está al final.

## 📱 El principio · 20 min

Este día no agrega un tema: agrega **el criterio para elegir bien entre cuatro opciones que suenan todas razonables**.

> **Principio 7 — Si el sistema YA produce output y el output es malo, el fix no es un flag, ni un formato, ni más infraestructura, ni una instrucción al modelo. Es cambiar QUÉ dato viaja o QUÉ contexto ve.**

El principio 6 ya lo tenés, pero lo aplicás solo dentro de Claude Code. El 7 es el mismo filo generalizado a **prompting y contexto**. Sus tres disfraces:

1. **"Instruile que siempre haga X"** → el modelo comprime probabilísticamente; ninguna instrucción sobrevive N rondas.
2. **"Agregá 'alta confianza' / 'sé cuidadoso' al system prompt"** → un adjetivo vago no es un criterio.
3. **"Falta un flag / el formato de salida / una base de datos"** → si el pipeline corre y entrega, no es plumbing.

> **Principio 7b — Si una opción invoca un mecanismo que suena avanzado, verificá que haga literalmente lo que la opción dice.**

## 📱 Los cinco fallos de contexto · 30 min

**1. Lost-in-the-middle.** El modelo atiende desproporcionadamente al principio y al final de secuencias largas; lo del medio se diluye. **Señal:** elige un ítem *específico pero equivocado* y el correcto estaba enterrado en el medio. Eso lo distingue de truncamiento — truncado, el ítem correcto no existiría para él. **Fix:** acotar el set antes de pasarlo, reposicionar lo crítico a los bordes, o partir en chunks y reducir por chunk.

**2. Progressive summarisation trap.** Resumir el historial entre rondas degrada números, fechas e identificadores a enunciados cualitativos, ronda tras ronda. **Fix: persistent facts block** — los datos exactos viven en un bloque estructurado FUERA de lo que se resume.

**3. Information provenance.** En multi-agente cada subagente atribuye bien, pero la síntesis borra la atribución **porque vivía en la prosa, y la prosa se reescribe**. **Fix: claim-source mappings estructurados** — dato, no prosa. Una bibliografía final es atribución a nivel documento, no a nivel claim.

**4. Session context isolation.** Si el paso que genera y el que revisa comparten sesión, el revisor hereda el razonamiento del generador y deja de revisar. **Señal:** "la review nunca encuentra nada". **Fix:** sesión independiente por paso.

**5. Ventana ≠ atención.** Más contexto no es más precisión: posterga y encarece. Distractor recurrente en los cuatro casos de arriba.

## 📱 Las tres transversales · 20 min

El principio 7 también decide preguntas de D3 y D4:

**T1 — Falsos positivos.** Una categoría de review tiene 40% de falsos positivos y los devs ignoran TODAS las categorías. Fix: desactivar esa categoría mientras se refinan sus criterios con ejemplos concretos; recupera la confianza en el resto ya mismo.

**T2 — Formato inconsistente pese a instrucciones detalladas.** Más instrucciones no lo arreglan. Fix: 2–4 few-shot con el razonamiento de cada decisión **y cobertura de edge cases** (async, manejo de errores). Ejemplos de un solo caso enseñan a pattern-matchear ese caso, no a generalizar.

**T3 — El mecanismo que suena avanzado.** Dos subagentes independientes en secuencia (8s + 12s): el fix son dos Task calls en UNA respuesta → ~12s. `fork_session` (verificado en docs) requiere `resume` y bifurca el historial en una sesión nueva que diverge desde ese punto — explorar una alternativa sin perder la original; **no paraleliza**. Mismo error de fase: un `PreToolUse` que "bloquea hasta que esté linteado" es imposible, el archivo aún no existe; lo que valida lo ya escrito es `PostToolUse`.

## 📱 Matriz de decisión · 15 min

| Síntoma | NO es | Es |
|---|---|---|
| Se pierde un número exacto tras varias rondas | Instruir al modelo · re-consultar la fuente | Persistent facts block |
| Elige un ítem específico pero equivocado, del medio | Truncamiento · más ventana | Lost-in-the-middle: acotar o reposicionar |
| La síntesis pierde la atribución | Bibliografía final · links en prosa | Claim-source mappings estructurados |
| La review nunca objeta nada | Falta `-p` · falta `--output-format json` | Sesiones independientes por paso |
| 40% de falsos positivos en una categoría | "Reportá solo alta confianza" | Desactivar + criterios explícitos con ejemplos |
| Formato inconsistente pese a instrucciones | Más instrucciones · post-procesar | Few-shot con razonamiento y edge cases |

Trampas: 1) el fix "de recuperación" (re-consultar) sirve una vez y vuelve a romperse — el examen pide el **structural fix**. 2) "más ventana" nunca es la respuesta. 3) Infraestructura extra (una DB, un servicio) es el distractor sofisticado. 4) Post-procesar enmascara, no arregla.

## 📱 Quiz del día · 25 min

Quiz **day-16** en la pestaña Quizzes — alimenta `context-mgmt` (6 preguntas) más `enforcement`, `refinement`, `extraction-accuracy` y `orchestration` (1 c/u, transversales del principio 7).

## 📱 Respuesta de apertura

**B.** El facts block saca los rule IDs del material que se comprime: sobreviven cualquier cantidad de rondas. **A** es recuperación, no fix — el próximo resumen los pierde otra vez. **C** es el disfraz nº1 del principio 7: instruir no gobierna la compresión. **D** posterga y encarece; con suficientes rondas se pierde igual.
