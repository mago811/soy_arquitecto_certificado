---
objective: 23
title: "Messages API o Message Batches API: ¿alguien está esperando?"
rule: "Si un humano o un pipeline está bloqueado esperando la respuesta → Messages API (síncrona). Si puede esperar hasta 24 h → Batches API: 50% más barato, resultados por custom_id."
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/batch-processing
    title: "Batch processing"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "Claude Certified Architect – Foundations (guía del examen, TS 4.5)"
status: verificada
---

## Qué es

Hay dos formas de mandar requests a Claude:

- **Messages API** (síncrona): mandás y esperás la respuesta. Latencia de segundos.
- **Message Batches API** (asíncrona): mandás muchos requests juntos, se procesan cuando se puede y después buscás los resultados. Cuesta **50% menos** ("All usage is charged at 50 percent of the standard API prices"). La mayoría termina en menos de 1 hora, pero puede tardar **hasta 24 horas**; si no termina en 24 h, lo que falta **expira**.

La pregunta clave: **¿hay alguien bloqueado esperando?**

| Caso | API | Por qué |
|---|---|---|
| Check de CI que bloquea el merge | Messages | El dev espera; 24 h es inaceptable |
| Chat con un cliente | Messages | Respuesta inmediata |
| Reporte nocturno de 50.000 documentos | Batches | Nadie espera; mitad de precio |
| Auditoría semanal, evals grandes | Batches | Tolerante a latencia |

## Cuándo se usa (y los detalles que toma el examen)

- **Límites:** hasta 100.000 requests o 256 MB por batch.
- **Request:** cada uno lleva `custom_id` (1–64 caracteres: letras, números, `-` y `_`) y `params` con los parámetros normales de Messages.
- **Orden:** los resultados pueden volver **en cualquier orden**. Se emparejan siempre por `custom_id`, nunca por posición.
- **Estado:** `processing_status` va de `in_progress` a `ended`. Polleás con `retrieve`.
- **Resultados:** `.jsonl`, uno por línea, con tipo `succeeded`, `errored`, `canceled` o `expired`. Los tres últimos no se cobran.
- **Fallas:** un request que falla no afecta a los demás. Reenviás **solo** los fallidos (por `custom_id`). Si es `invalid_request_error`, primero arreglás el request.
- **Validación:** los `params` se validan de forma asíncrona y los errores aparecen recién cuando termina el batch. Por eso la doc recomienda probar el shape con la Messages API antes.
- **No soporta:** `stream: true`, `speed` (fast mode), `fallbacks`, `max_tokens: 0`.
- **Sí soporta:** visión, tool use (incluidas server tools), system, multi-turn, extended thinking, prompt caching (descuentos que se suman).
- **Retención:** resultados disponibles **29 días** desde la creación.
- **No se edita:** un batch enviado no se modifica; se cancela y se manda otro.
- **`pause_turn`:** con server tools, si un resultado vuelve con `stop_reason: "pause_turn"`, el turno no terminó; se continúa con otro request.

Con **tools tuyas** (client tools), cada request del batch vuelve como un resultado (un `message`). Si Claude pide una tool, el `tool_result` lo mandás vos en **otro** request (otro batch o la Messages API). Por eso un loop agéntico con tools tuyas hecho a puro batch puede esperar hasta 24 h por cada vuelta. (Las server tools son distinto: corren su loop del lado del servidor dentro del mismo request.)

## El error típico que el examen quiere que cometas

1. **"Pasemos el check pre-merge a batch para ahorrar 50%".** Ahorrás plata y bloqueás al equipo hasta 24 h. El examen pide que tengas en cuenta el bloqueo, no solo el costo.
2. **"Leé los resultados en el mismo orden en que mandaste".** No hay orden garantizado: `custom_id`.
3. **"Falló el 3%, reenviá el batch entero".** Pagás de nuevo el 97% que ya estaba bien.
4. **Cuenta de SLA.** Si te piden respuesta en 30 h y el batch puede tardar 24 h, no podés juntar documentos un día entero: tenés que mandar batches más seguido (por ejemplo, cada 4 h: 4 + 24 = 28 h ≤ 30 h).

## Ejemplo

Una aseguradora clasifica 40.000 siniestros por noche. Hoy usa un loop síncrono, pega en los rate limits y paga precio completo. Fix: un batch nocturno con `custom_id = "siniestro-<id>"`, poll cada 60 s y procesar resultados según `custom_id` y tipo. Los `errored` con `invalid_request_error` se corrigen y van en un batch chico aparte; los `expired` se reenvían igual.

## Para recordar

- **¿Bloquea a alguien?** Sí → Messages. No → Batches.
- 50% de descuento · hasta 24 h · expira si no termina · resultados 29 días.
- `custom_id` para todo: emparejar y reintentar.
- Probá el request con Messages API antes de mandar 50.000.
