---
dia: 4
titulo: tool_choice y secuenciación multi-tool
duracion: 2h
---

## 📱 Pregunta de apertura · 5 min

**Un agente OT tiene dos tools: `buscar_dispositivo` (devuelve el device_id de un PLC) y `aislar_dispositivo` (necesita ese device_id). El dev seteó tool_choice {"type": "any"} "para que llame las dos en orden". A veces el modelo llama aislar_dispositivo primero, con un device_id inventado. ¿Cuál es el fix?**

- A) Listar buscar_dispositivo primero en el array tools, porque ese orden define la ejecución
- B) Marcar device_id como required en el schema de aislar_dispositivo
- C) Encadenar requests: forzar buscar_dispositivo con {"type": "tool"}, devolver el tool_result, y que el siguiente request llame aislar_dispositivo con el id real
- D) Agregar disable_parallel_tool_use: true para que las llamadas salgan de a una y en orden

Elegí antes de seguir. La respuesta está al final del brief.

## 📱 El principio · 15 min

**"tool_choice controla SI se llama una tool. Nunca controla el ORDEN entre tools ni la VERDAD de los argumentos."**

Los 4 valores: **auto** (default: el modelo decide, puede no usar ninguna) · **any** (obligado a usar ALGUNA) · **tool** + name (obligado a usar ESA) · **none** (prohibido usar tools).

La trampa central: **any y tool FUERZAN una llamada inmediata en ESA respuesta.** Si el modelo no tiene los datos para los argumentos, no puede decir "primero necesito buscar": los inventa, con formato perfecto. Forzar ≠ garantizar datos correctos. Acá se cruzan tus principios de oro 3 y 5.

Segunda pata: **la API no ejecuta nada.** stop_reason `tool_use` significa "quiero ejecutar esta tool, pasame el resultado": el CLIENTE la ejecuta y devuelve el `tool_result` en el siguiente mensaje user. Y como la API es stateless (día 3), la dependencia "B necesita el output de A" solo se garantiza con **requests encadenados**: request 1 llama A (forzada con type tool si querés), ejecutás A, devolvés su tool_result en el historial, y en el request 2 el modelo llama B con datos reales.

Palabras gatillo del examen: **"en el orden correcto", "primero X y después Y", "B depende de A"** → requests encadenados, jamás un valor mágico de tool_choice.

## 📱 Escenarios de examen · 30 min

**E1 — "any garantiza el orden".** Dos tools dependientes, tool_choice any, y la segunda sale primera con argumentos inventados. Fix: **encadenar requests**. Por qué: any obliga a llamar algo YA; sin el dato real en contexto, el modelo lo fabrica. El orden lo garantiza el cliente, no la API.

**E2 — El bot que conversa en vez de actuar.** Agente que debe registrar CADA alerta usando alguna de sus tools; con auto (el default) a veces responde en texto y no llama ninguna. Fix: **{"type": "any"}** — pero SOLO porque acá todos los argumentos vienen completos en el mensaje. Si faltaran datos, any te devuelve al problema de E1.

**E3 — Extracción con tool única.** Pipeline que vuelca campos de un mail en la tool registrar_reclamo; con auto el modelo a veces "charla" en vez de extraer. Fix: **{"type": "tool", "name": "registrar_reclamo"}**. Forzar ESA tool es correcto cuando es una sola y los datos están en el input.

**E4 — Prohibido tocar tools.** Último request de un pipeline: los tool_results ya están en el historial y querés SOLO el resumen en texto, pero el modelo sigue pidiendo tools. Fix: **{"type": "none"}** — las tools quedan definidas, pero llamarlas está prohibido en esa respuesta.

**E5 — tool_results por goteo.** El modelo pidió 3 tools en paralelo (3 bloques tool_use en UNA respuesta); el cliente devolvió tres mensajes user separados y la API rechaza. Fix: ejecutar las 3 y devolver **los 3 tool_result en UN solo mensaje user**, cada uno con su tool_use_id. Una respuesta con N tool_use se contesta con un mensaje user con N tool_result.

## 📱 Matriz de decisión · 10 min

| Valor | Qué garantiza | Qué NO garantiza | Cuándo rompe |
|---|---|---|---|
| auto (default) | nada: el modelo decide | que use alguna tool | cuando el negocio exige tool SIEMPRE |
| any | ≥1 tool call en esta respuesta | cuál, en qué orden, con qué datos | tools dependientes sin datos → fabrica argumentos |
| tool + name | esa tool se llama en esta respuesta | argumentos verdaderos | si faltan datos, los inventa igual |
| none | cero tool calls | — | cuando esperabas que llame algo |

Trampas conocidas: 1) **NINGÚN valor de tool_choice garantiza orden**: orden = requests encadenados. 2) El orden del array tools NO define ejecución (distractor clásico). 3) `required` valida presencia, no verdad: un id inventado con formato válido pasa. 4) `disable_parallel_tool_use: true` limita a ≤1 tool por respuesta; no ordena nada, ni entre requests ni entre tools. 5) La API jamás ejecuta tools custom: stop_reason `tool_use` = la pelota está del lado del cliente. 6) Por default el modelo puede pedir VARIAS tools en una respuesta; todos los tool_result vuelven en UN mensaje user.

## 💻 Lab · 40 min

Abrí `labs/day-04-tool-choice.md` en la PC: vas a forzar dos tools con any, verlas fallar con IDs inventados, y arreglarlo encadenando requests.

## 📱 Quiz del día · 20 min

Quiz **day-04** en la pestaña Quizzes del dashboard — alimenta el objetivo `tool-choice` del semáforo.

## 📱 Respuesta de apertura

**C.** Dependencia entre tools → requests encadenados: el modelo recién tiene el device_id real cuando el tool_result de buscar_dispositivo está en el historial. A: el orden del array no tiene semántica de ejecución. B: required obliga a que el campo venga, y el modelo lo llena inventando. D: disable_parallel_tool_use limita cantidad por respuesta, no define orden.
