---
dia: 11
titulo: Confirmación de fortalezas
duracion: 1.5h
---

## 📱 Pregunta de apertura · 5 min

**Una fintech tiene 80.000 tickets de soporte acumulados para clasificar antes de mañana, y además un chat de soporte en vivo. Un dev propone mandar TODO por la Message Batches API "porque tiene 50% de descuento". ¿Cuál es la arquitectura correcta?**

- A) Batches para todo: el descuento aplica igual y la mayoría de los batches termina en menos de 1h
- B) Messages API para todo, paralelizando los 80k tickets en requests concurrentes
- C) Batches para los 80k tickets; Messages API síncrona para el chat en vivo
- D) Batches para el chat (más barato) y Messages API para los tickets (más rápido)

Elegí antes de seguir. La respuesta está al final.

## 📱 El principio · 10 min

**"Lo verde se confirma, no se re-estudia."**

Estos cinco objetivos los clavaste al 100% en el primer intento. Hoy NO es día de estudio: es un chequeo de que siguen ahí después de una semana metido en zonas rojas. El riesgo real no es el olvido — es la sobre-corrección: tras días de "todo a enforcement" y "nullable en todo", el examen te va a tentar a aplicar esos reflejos donde no corresponden.

El plan: cinco escenarios exprés, un quiz sin piedad, y solo si algo falla ahí, ESO se repasa. Nada más.

## 📱 Escenarios exprés · 30 min

Uno por objetivo. Decidí el fix ANTES de leer la respuesta.

**E1 — Orquestación.** Auditar 12 repos de microservicios buscando dependencias vulnerables; un solo agente los recorre en secuencia, tarda horas y desborda el contexto. Fix: **orchestrator-workers** — un subagente por repo, en paralelo (son independientes), y el orquestador sintetiza el reporte. Regla: subtareas independientes se paralelizan, dependientes se encadenan; el orquestador no hace el trabajo — lo reparte y sintetiza.

**E2 — Hooks y slash commands.** El equipo pega a mano el mismo prompt de code review en cada sesión; un dev lo copió a CLAUDE.md "para tenerlo siempre" y ahora carga en todas las sesiones aunque nadie lo pida. Fix: **slash command en `.claude/commands/`** del proyecto (versionado, compartido, se invoca a demanda). Personal → `~/.claude/commands/`. CLAUDE.md es contexto permanente; un prompt reutilizable a demanda es un slash command. Y de hooks, lo de siempre: PreToolUse bloquea con **exit 2** (stderr a Claude), PostToolUse reacciona después.

**E3 — Batches.** 50.000 tickets para clasificar overnight con un loop síncrono de Messages API: rate limits, precio completo, horas de corrida. Fix: **Message Batches API** — asíncrona, 50% de descuento, la mayoría termina en menos de 1h con máximo de 24h; un `custom_id` por ticket porque los resultados llegan en cualquier orden. Regla: volumen no urgente → Batches; latencia interactiva → Messages síncrona.

**E4 — Context management.** Sesión larga de refactor en Claude Code: el agente empieza a ignorar convenciones y a repetir trabajo ya hecho. Fix: **/compact** (o dejar actuar la auto-compaction): resume la conversación preservando lo esencial. En la API el equivalente es del lado cliente: truncar o resumir el historial. Regla: la ventana es finita y el contexto irrelevante diluye las instrucciones — más contexto NO siempre es mejor.

**E5 — Human review.** Un pipeline de análisis de contratos manda TODO a revisión legal: los abogados están tapados y el sistema no ahorra nada. Fix: **routing por riesgo/confianza** — bajo riesgo o alta confianza sigue automático; alto riesgo o baja confianza va a un humano. Regla: umbral, nunca "todo a humano" ni "nada a humano". Y todo feedback loop automatizado necesita criterio de corte: tras N intentos fallidos, escala.

## 📱 Quiz del día · 40 min

Quiz **day-11** en el dashboard: 10 preguntas, 2 por cada objetivo verde. Dificultad de examen real — son tus fortalezas y no te regalo nada.

Lo que salga mal ahí, ESO sí se repasa hoy mismo: releé el escenario exprés correspondiente y el rationale de la pregunta. Lo que salga bien queda confirmado y no se toca hasta el simulacro.

Cerrá tachando el día 11 y mirá el semáforo: mañana, simulacro completo #1.

## 📱 Respuesta de apertura

**C.** Batches es para volumen no urgente: asíncrona, 50% de descuento, la mayoría en menos de 1h pero con máximo de 24h — perfecto para los 80k tickets con un custom_id por cada uno. El chat en vivo necesita latencia interactiva: Messages API síncrona. A y D ponen un canal interactivo detrás de una API sin garantía de latencia; B paga precio completo y pelea rate limits por un lote que puede esperar.
