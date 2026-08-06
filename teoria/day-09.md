---
dia: 9
titulo: Descomposición dinámica + iterative refinement
duracion: 1.5h
---

## 📱 Pregunta de apertura · 5 min

**Un equipo armó un agente que analiza repos con un pipeline fijo de 4 workers: frontend, backend, tests y docs. Con el monorepo de 12 packages de un cliente, el análisis salió incompleto: 8 packages ni se miraron. ¿Cuál es el fix?**

- A) Agregar más workers fijos hasta cubrir los casos conocidos
- B) Un orquestador que primero liste la estructura del repo y decida en runtime qué workers despachar
- C) Un solo prompt gigante que pida analizar todo el repo de una vez
- D) Pedirle al usuario que declare los módulos antes de correr el pipeline

Elegí antes de seguir. La respuesta está al final del brief.

## 📱 El principio · 15 min

**Descomposición:** "Si la estructura del trabajo recién se conoce al ver los datos, la decide un orquestador en runtime; si los pasos son siempre los mismos, pipeline estático."

**Refinement:** "El feedback que mejora es dirigido — issues concretos, con ejemplos del error, batcheados en una sola pasada — y todo loop necesita criterio de corte."

En el patrón **orchestrator-workers**, el orquestador mira el input, decide qué subtareas existen, despacha un worker por cada una y agrega los resultados. En un **pipeline estático** los pasos están fijados antes de ver dato alguno. Ninguno es "mejor": la pregunta del examen es siempre *¿la estructura del trabajo se conoce de antemano o no?* Y dentro de las subtareas: independientes → paralelizables; dependientes → en secuencia. Es el mismo principio que los tools encadenados (ver teoria/day-04.md): la dependencia define el orden.

## 📱 Escenarios de examen · 35 min

**E1 — El pipeline que no entra.** "Analizá este repo": no sabés cuántos módulos hay hasta listarlos, y el pipeline fijo de N pasos deja afuera lo que no previó. Fix: **orchestrator-workers** — el orquestador lista la estructura y crea un worker por módulo encontrado. Por qué: la cantidad y el tipo de subtareas dependen del dato, no del diseño.

**E2 — "Paralelizá todo".** Extraer datos de 50 contratos y escribir un resumen comparativo. Alguien lanza las 51 tareas en paralelo y el resumen sale vacío o inventado: corrió sin los 50 outputs. Fix: extracciones en paralelo (independientes) y **el resumen después, secuencial**, recibiendo los 50 resultados. Por qué: dependencia = orden obligatorio; paralelizar dependencias rompe o fabrica.

**E3 — La trampa invertida.** Facturas: parsear → clasificar → guardar, siempre igual. Alguien propone migrar a orchestrator-workers "para que escale". Fix: **quedarse con el pipeline estático**. Cuando los pasos no varían con el input, lo dinámico solo agrega complejidad, latencia y puntos de falla.

**E4 — "Hacelo mejor".** Loop generador-revisor donde el revisor devuelve "mejorá la redacción y la calidad". Tras 5 iteraciones el texto cambia pero no mejora. Fix: **feedback dirigido** — issues concretos con ejemplos citados del output ("el título repite X", "la cifra del párrafo 3 no coincide con la fuente"). Feedback vago → mejora aleatoria; con ejemplos → mejora dirigida.

**E5 — El loop eterno y de a uno.** El revisor manda UN issue por iteración e itera "hasta que quede perfecto": 9 pasadas, presupuesto quemado, y el revisor siempre encuentra algo nuevo. Fix doble: **batchear todos los issues en una pasada** ("arreglá estos 3: …") y ponerle al loop un **criterio de corte** — máximo de iteraciones o umbral de calidad.

## 📱 Matriz de decisión · 15 min

| Señal del escenario | Arquitectura |
|---|---|
| Pasos siempre iguales, conocidos de antemano | Pipeline estático |
| Subtareas que recién se conocen al ver el input | Orchestrator-workers (dinámico) |
| Subtareas independientes entre sí | Workers en paralelo |
| Una subtarea consume el output de otra | Secuencia, jamás paralelo |

| Feedback del loop | Resultado |
|---|---|
| "Hacelo mejor" / "más calidad" | Mejora aleatoria |
| Issues concretos + ejemplos del error, batcheados | Mejora dirigida en una pasada |
| Un issue por iteración | Las mismas mejoras a N veces el costo |
| Sin máximo de iteraciones ni umbral | Loop infinito / presupuesto quemado |

Trampas conocidas: 1) "paralelizá todo, es más rápido" — solo vale entre independientes. 2) "un orquestador siempre escala mejor" — con pasos fijos es puro overhead. 3) "un issue por iteración es más prolijo" — son N requests para lo que entra en uno. 4) "iterá hasta que esté perfecto" — sin corte no es un workflow, es un loop infinito. 5) Feedback largo sin ejemplos concretos sigue siendo feedback vago.

## 📱 Quiz del día · 20 min

Quiz **day-09** en la pestaña Quizzes del dashboard — alimenta los objetivos `decomposition` y `refinement` del semáforo.

## 📱 Respuesta de apertura

**B.** La cantidad de subtareas depende del repo, y eso solo lo puede decidir un orquestador que mire los datos primero. A persigue casos conocidos y siempre queda corto ante el próximo repo distinto; C mete todo en un contexto y pierde profundidad por módulo; D le traslada al usuario justo el trabajo que define al patrón: descubrir la estructura.
