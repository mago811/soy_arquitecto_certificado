---
dia: 3
titulo: "API stateless: historial multi-turno"
duracion: 1.5h
---

## 📱 Pregunta de apertura · 5 min

**Un agente de soporte llama a la tool `consultar_pedido`. La API responde con `stop_reason: tool_use`. Tu backend ejecuta la tool y arma el siguiente request. ¿Qué tiene que ir en `messages`?**

- A) Solo un turno user con el tool_result: la API ya tiene el resto de la conversación asociada al request anterior
- B) El historial completo: todos los turnos previos, el turno assistant con el bloque tool_use, y un turno user nuevo con el tool_result referenciando el tool_use_id
- C) El tool_result como parámetro top-level `tool_results`, fuera de messages
- D) Nada: la API ejecuta la tool por vos y sigue sola; solo hay que pollear el resultado

Elegí antes de seguir. La respuesta está al final del brief.

## 📱 El principio · 10 min

**"Cada request es la conversación entera: la API no recuerda nada de nada."**

La Messages API es **100% stateless**. No hay `conversation_id`, no hay sesiones, no hay memoria server-side: cualquier opción de examen que sugiera lo contrario es **falsa, siempre** (principio de oro 4). Cada request debe traer TODO lo que el modelo necesita ver: el **system prompt** (se manda en CADA request, no persiste) y el **array messages completo**, con los turnos user y assistant acumulados.

Consecuencias directas: el **dueño del historial es tu app** (si querés que sobreviva a un reinicio, va a una DB; si tenés varios usuarios, un historial por conversación en TU storage), y el **costo crece turno a turno** (`usage.input_tokens` sube porque el input ES la conversación entera — se gestiona del lado cliente con truncado/resumen; prompt caching abarata lo repetido pero no te exime de mandarlo).

Traducción a tu mundo OT: es un firewall **sin connection tracking**. Cada paquete se evalúa solo, sin estado de sesión: si el paquete necesita contexto, el contexto viaja adentro del paquete.

Palabras gatillo del examen: **"la API recuerda / retoma / sesión / conversation_id / header de persistencia / se actualiza solo"** → falso. **"El cliente acumula, persiste y reenvía"** → verdadero.

## 📱 Escenarios de examen · 20 min

**E1 — Las conversaciones "perdidas".** Redeploy del backend y todos los chats activos arrancan de cero; el dev culpa a la API. Diagnóstico: el historial vivía en la memoria del proceso de la app — **la API nunca lo tuvo**. Fix: persistir los historiales en una DB por conversación y rearmar `messages` en cada request.

**E2 — El tool_result huérfano.** Tras un tool_use, el backend manda un request nuevo cuyo `messages` contiene solo el turno user con el tool_result → **400**. Por qué: cada request es autocontenido; el tool_result debe referenciar (por `tool_use_id`) un bloque tool_use que esté en el turno assistant de ESE MISMO request. Fix: historial completo + turno assistant con tool_use + turno user con tool_result.

**E3 — El bot que pierde la personalidad.** System prompt enviado solo en el primer request "para ahorrar tokens"; del segundo turno en adelante el bot ignora las reglas. Fix: **system va en cada request**. El ahorro se logra con prompt caching, no omitiendo.

**E4 — La factura que sube sola.** Producto reporta `input_tokens` creciente como memory leak. No es bug: es la consecuencia natural del historial completo. Fix del costo: **truncar o resumir** turnos viejos del lado cliente; **prompt caching** abarata el prefijo repetido — que igual viaja.

**E5 — Los usuarios cruzados.** Un solo `historial` global en el backend y un cliente ve datos de otro. Fix: el aislamiento también es del cliente — **un historial por usuario/conversación** en el storage de la app. La API responde en base al `messages` que le des, sin preguntarse de quién es.

## 📱 Matriz de decisión · 10 min

| Síntoma | Causa real | Fix |
|---|---|---|
| El bot olvida el turno anterior | se manda solo el mensaje nuevo | acumular y reenviar el historial completo (user + assistant) |
| 400 al devolver un tool_result | falta el turno assistant con el tool_use en ese request | historial completo + tool_result con tool_use_id |
| Se pierde la personalidad/reglas | system solo en el primer request | system en cada request |
| Conversaciones mueren al redeploy | historial en memoria de la app | persistir en DB; la API nunca lo tuvo |
| input_tokens crece por turno | comportamiento esperado del modelo stateless | truncar/resumir client-side; prompt caching abarata |

Trampas típicas de distractores: 1) `conversation_id` / `session_id` — **no existen**. 2) "modo session" o headers de persistencia — **no existen**. 3) "la API actualiza el system prompt entre turnos" — el system lo arma y manda el cliente, siempre. 4) "prompt caching = memoria" — el cache abarata tokens repetidos, no guarda conversación: el contenido viaja igual. 5) "la API ejecuta la tool y sigue sola" — la API solo PIDE (tool_use) y RECIBE (tool_result); ejecutar es tu trabajo.

## 💻 Lab · 30 min

Abrí `labs/day-03-api-stateless.md` en la PC: vas a construir el chatbot que olvida, arreglarlo, y romperlo por la mitad para ver que las dos mitades del historial importan.

## 📱 Quiz del día · 15 min

Quiz **day-03** en la pestaña Quizzes del dashboard — alimenta el objetivo `api-stateless` del semáforo.

## 📱 Respuesta de apertura

**B.** Para la API el "request anterior" no existe: el siguiente request lleva TODO el historial, incluido el turno assistant con el tool_use, más un turno user con el tool_result referenciando el tool_use_id. A y D asumen memoria o ejecución server-side (falsas siempre); C: el tool_result es un bloque de contenido dentro de messages, no un parámetro top-level.
