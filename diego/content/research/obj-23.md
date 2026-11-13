# Research — Objetivo 23 (Messages API vs. Message Batches API)

Fecha de lectura: 2026-11-13. Página leída en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://platform.claude.com/docs/en/build-with-claude/batch-processing
- https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation (sección "Consider batch processing": ojo, ahí "batch" es meter varios mensajes en UN prompt, no la Batches API)
- Guía del examen (PDF), Task Statement 4.5

## Guía del examen — TS 4.5 (cita textual del PDF)

- "The Message Batches API: 50% cost savings, up to 24-hour processing window, no guaranteed latency SLA"
- "Batch processing is appropriate for non-blocking, latency-tolerant workloads (overnight reports, weekly audits, nightly test generation) and inappropriate for blocking workflows (pre-merge checks)"
- "The batch API does not support multi-turn tool calling within a single request (cannot execute tools mid-request and return results)"
- "custom_id fields for correlating batch request/response pairs"
- Skills: "Calculating batch submission frequency based on SLA constraints (e.g., 4-hour windows to guarantee 30-hour SLA with 24-hour batch processing)" · "Handling batch failures: resubmitting only failed documents (identified by custom_id) with appropriate modifications (e.g., chunking documents that exceeded context limits)" · "Using prompt refinement on a sample set before batch-processing large volumes"

## Batch processing (doc)

Cuándo:
- "This pattern is particularly useful when: You need to process large volumes of data · Immediate responses are not required · You want to optimize for cost efficiency · You’re running large-scale evaluations or analyses"
- "This approach is well-suited to tasks that do not require immediate responses, with most batches finishing in less than 1 hour while reducing costs by 50 percent and increasing throughput."

Cómo funciona:
- "The batch is then processed asynchronously, with each request handled independently."
- "You can poll for the status of the batch and retrieve results when processing has ended for all requests."

Límites:
- "A Message Batch is limited to either 100,000 Message requests or 256 MB in size, whichever is reached first."
- "You can access batch results when all messages have completed or after 24 hours, whichever comes first. Batches expire if processing does not complete within 24 hours."
- "Batch results are available for 29 days after creation. After that, you can still view the batch, but its results are no longer available for download."
- "Batches are scoped to a Workspace in the Claude Console"
- "Each batched request must have `max_tokens` of at least `1`."
- FAQ: "Batches might take up to 24 hours for processing, but many complete sooner. Actual processing time depends on the size of the batch, current demand, and your request volume. It is possible for a batch to expire and not complete within 24 hours."
- FAQ: "No, once a batch has been submitted, it cannot be modified. If you need to make changes, cancel the current batch and submit a new one."
- FAQ: "Usage of the Batches API does not affect rate limits in the Messages API."

Qué se puede batchear / qué no:
- Sí: "Vision", "Tool use, including all server tools", "System messages", "Multi-turn conversations", "Extended thinking", "Most beta features".
- "Because each request in the batch is processed independently, you can mix different types of requests within a single batch."
- NO (validation error): `stream: true` ("Batch results come back as a single file, not a stream."), `speed` (fast mode), `fallbacks`, `max_tokens: 0`.

Precio:
- "All usage is charged at 50 percent of the standard API prices."
- FAQ: "This applies to input tokens, output tokens, and any special tokens."
- Prompt caching: "The pricing discounts from prompt caching and Message Batches can stack" · "cache hits are provided on a best-effort basis".

Request shape:
- "A unique `custom_id` for identifying the Messages request. Must be 1 to 64 characters and contain only alphanumeric characters, hyphens, and underscores (matching `^[a-zA-Z0-9_-]{1,64}$`)."
- "A `params` object with the standard Messages API parameters"
- Tip: "The API validates the `params` object of each message request asynchronously, and returns validation errors when processing of the entire batch has ended. To check that you build your input correctly, verify your request shape with the Messages API first."

Estado y resultados:
- `processing_status`: "It starts as `in_progress`, then updates to `ended` once all the requests in the batch have finished processing, and results are ready."
- Tipos de resultado: `succeeded`, `errored` ("You aren’t billed for these requests."), `canceled`, `expired` ("Batch reached its 24-hour expiration before this request could be sent to the model. You aren’t billed for these requests.").
- "The results are in `.jsonl` format, where each line is a valid JSON object representing the result of a single request in the Message Batch."
- "Batch results can be returned in any order, and might not match the ordering of requests when the batch was created." · "To correctly match results with their corresponding requests, always use the `custom_id` field."
- Ejemplo Python: `invalid_request_error` → "Request body must be fixed before re-sending request"; otros errores → "Request can be retried directly".
- "Note that the failure of one request in a batch does not affect the processing of other requests."
- Cancel: "Canceled batches end up with a status of `ended` and might contain partial results for requests that were processed before cancellation."

Server tools:
- "The batch worker runs the same server-side agentic loop as the synchronous Messages API."
- "If a batch result comes back with `pause_turn`, the turn did not complete; you can continue it by submitting the paused assistant content in a follow-up request (batch or synchronous)"

Best practices:
- "Monitor batch processing status regularly and implement appropriate retry logic for failed requests."
- "Use meaningful `custom_id` values to easily match results with requests, because order is not guaranteed."
- "Consider breaking very large datasets into multiple batches for better manageability."
- "Dry run a single request shape with the Messages API to avoid validation errors."

Retención: "Batch processing stores request and response data for up to 29 days after batch creation." Data handling: ZDR "Not eligible".

## Ejemplo Python de la doc (base del lab)

`client.messages.batches.create(requests=[Request(custom_id=..., params=MessageCreateParamsNonStreaming(model=..., max_tokens=..., messages=[...]))])`, `client.messages.batches.retrieve(id)` con `processing_status == "ended"`, `client.messages.batches.results(id)` con `match result.result.type`.

## Lo que la doc no dice explícito

- "No guaranteed latency SLA" es frase de la guía; la doc dice "up to 24 hours" y "It is possible for a batch to expire". Se usa eso.
- Tool calling multi-turno con tools del cliente dentro de un request de batch: la doc no lo dice con esas palabras (sí dice que server tools corren el loop server-side). En la lección se explica que cada request vuelve como un resultado final; el ida y vuelta de `tool_result` necesita otro request. No se usa como respuesta correcta de pregunta.
