# Research — Objetivo 25 (elegir el método de salida estructurada más fiable)

Fecha de lectura: 2026-11-13. Páginas leídas completas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools (la URL pedida `.../implement-tool-use` redirige acá)
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (sección "Migrating away from prefilled responses")
- https://platform.claude.com/docs/en/api/errors (sección "Prefill not supported")
- https://platform.claude.com/docs/en/build-with-claude/thinking (sección "Response prefill and forced tool use")
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prefill-claudes-response → **ya no existe**: redirige a `.../prompt-engineering/overview`, que no habla de prefill. El contenido de prefill vive ahora en increase-consistency y en claude-prompting-best-practices.
- https://platform.claude.com/docs/en/models/overview y https://platform.claude.com/docs/en/about-claude/model-deprecations (IDs de modelos para el lab)

## Nombre exacto de los parámetros (verificado)

- JSON outputs: **`output_config.format`** con `type: "json_schema"` y `schema`. NO es `output_format` top-level.
  - "The request carries the schema in output_config.format with type: "json_schema". SDK helpers set this for you." (structured-outputs)
  - "The output_format parameter has moved to output_config.format, and beta headers are no longer required. The output_format parameter is deprecated. To use it anyway, add the structured-outputs-2025-11-13 beta header. Without it, the API returns a 400 error." (structured-outputs, Migrating from the beta)
  - "In the Python SDK (v1.0 and later), a schema dictionary passed as output_format={...} raises a TypeError. Use output_config instead. A Pydantic model passed as output_format=Model to parse() or stream() works with no change and no beta header, because the SDK sends it as output_config." (structured-outputs)
  - Python: `client.messages.parse(model=..., output_format=Invoice, ...)` → `response.parsed_output`. Raw: `client.messages.create(..., output_config={"format": {"type": "json_schema", "schema": {...}}})` y se lee el bloque `text` con `json.loads`.
  - TypeScript: `client.messages.parse({ ..., output_config: { format: zodOutputFormat(Schema) } })`; para schema plano `jsonSchemaOutputFormat()`.
- Strict tool use: **`strict: true`** top-level en la definición de la tool.
  - "Set "strict": true as a top-level property in your tool definition, alongside name, description, and input_schema." (strict-tool-use)

## Citas clave

### Por qué el prompt solo no alcanza
- "Without structured outputs, Claude can generate malformed JSON responses or invalid tool inputs that break your applications. Even with careful prompting, you might encounter:" → parsing errors, missing required fields, inconsistent data types, schema violations. (structured-outputs)
- "Structured outputs guarantee schema-compliant responses through constrained decoding:" / "Always valid: No JSON parsing errors" / "Reliable: No retries needed for schema violations" (structured-outputs)
- "If you need Claude to always output valid JSON that conforms to a specific schema, use Structured Outputs instead of the prompt engineering techniques below. Structured outputs provide guaranteed schema compliance and are specifically designed for this use case." (increase-consistency)
- "The techniques below are useful for general output consistency or when you need flexibility beyond strict JSON schemas." (increase-consistency)
- "A clear sign that you should be using tools: if you're writing a regex to extract a decision from model output, that decision should have been a tool call." (how-tool-use-works)

### Dos features complementarias
- "JSON outputs (output_config.format): Get Claude's response in a specific JSON format" / "Strict tool use (strict: true): Guarantee schema validation on tool names and inputs." (structured-outputs)
- "JSON outputs control Claude's response format (what Claude says)." / "Strict tool use validates tool parameters (how Claude calls your functions)." (structured-outputs)
- "When combined, Claude can call tools with guaranteed-valid parameters AND return structured JSON responses." (structured-outputs)

### Prefill (limitaciones en modelos recientes)
- "Prefilling is not supported on Claude 4.6 and later models and Claude Mythos Preview. Use structured outputs on models that support it, or system prompt instructions, instead." (increase-consistency, Note)
- "Starting with Claude 4.6 models and Claude Mythos Preview, prefilled responses (providing a partial assistant message for Claude to continue from) on the last assistant turn are no longer supported. Requests with prefilled assistant messages to these models return a 400 error." (claude-prompting-best-practices)
- Migración de formato: "The structured outputs feature is designed specifically to constrain Claude's responses to follow a given schema. [...] For classification tasks, use either tools with an enum field containing your valid labels or structured outputs." (claude-prompting-best-practices)
- "Claude 4.6 and later models and Claude Mythos Preview do not support prefilling assistant messages. Sending a request with a prefilled last assistant message to any of these models returns a 400 invalid_request_error" (api/errors)
- "Message prefilling: Prefilling is incompatible with JSON outputs." (structured-outputs, Feature compatibility)
- "Earlier models continue to support prefills, and adding assistant messages elsewhere in the conversation is not affected." (claude-prompting-best-practices)

### Casos donde la salida puede no cumplir el schema
- "Although structured outputs guarantee schema compliance in most cases, there are scenarios where the output might not match your schema:" (structured-outputs)
- Refusal: "The response has stop_reason: "refusal"." / "The output might not match your schema because the refusal message takes precedence over schema constraints." (structured-outputs)
- max_tokens: "The output might be incomplete and not match your schema." / "Retry with a higher max_tokens value to get the complete structured output." (structured-outputs)
- Enum casing: "Structured outputs don't guarantee the capitalization of string enum and const values" / "Compare enum values case-insensitively, and avoid enum values that differ only in capitalization." (structured-outputs)

### Limitaciones del JSON Schema
- No soportado: recursive schemas, complex types within enums, external $ref, "Numerical constraints (such as minimum, maximum, multipleOf)", "String constraints (minLength, maxLength)", "additionalProperties set to anything other than false". "If you use an unsupported feature, you'll receive a 400 error with details." (structured-outputs)
- SDK transformation: "Remove unsupported constraints (for example, minimum, maximum, minLength, maxLength)" / "Update descriptions by adding each unsupported constraint to the field's description" / "Validate responses against your original schema and all its constraints, if the helper validates responses" (structured-outputs)
- "pass the schema through transform_schema() from the anthropic package before sending it" (structured-outputs, Python)

### Incompatibilidades
- "Citations: Citations require interleaving citation blocks with text, which conflicts with strict JSON schema constraints. The API returns a 400 error if citations are enabled with output_config.format." (structured-outputs)

### Disponibilidad
- "Structured outputs are available on every model and eligible for HIPAA readiness." (structured-outputs)
- "Strict tool use is available on every model and eligible for HIPAA readiness." (strict-tool-use)

## Modelos (para el lab)
- IDs activos: `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5` (models/overview). Los ejemplos de la doc usan `claude-opus-5-5`.
- `claude-sonnet-4-5-20250929`: Deprecated, retirement November 30, 2026 (model-deprecations). Por eso el lab NO usa `claude-sonnet-4-5`.

## Lo que NO encontré en la doc
- Una página dedicada "JSON mode" no existe; el equivalente actual es structured outputs (`output_config.format`).
- La página de prefill (`prefill-claudes-response`) ya no existe como tal.
