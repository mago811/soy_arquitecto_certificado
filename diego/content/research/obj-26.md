# Research — Objetivo 26 (schemas de extracción: opcionales, nullable, enums, sin inventar)

Fecha de lectura: 2026-11-13. Páginas leídas completas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices

## Opcional = fuera de `required`
- Ejemplo de la doc: `"required": ["location"]` con `unit` fuera → "This tool, named get_weather, expects an input object with a required location string and an optional unit string that must be either celsius or fahrenheit." (define-tools)

## Nullable y tipos soportados
- "All basic types: object, array, string, integer, number, boolean, null" (structured-outputs, Supported features)
- "enum (strings, numbers, booleans, or nulls only, no complex types)." (structured-outputs)
- "anyOf and allOf (with limitations: allOf with $ref not supported)" (structured-outputs)
- Límite: "Parameters with union types | 16 | Total parameters that use anyOf or type arrays (for example, "type": ["string", "null"]) across all strict schemas. These are especially expensive because they create exponential compilation cost." (structured-outputs) → confirma que `"type": ["string", "null"]` es la forma reconocida de nullable.
- Pydantic: ejemplo de la doc `errors: list[APIError] | None = None` (structured-outputs, API response formatting).

## El modelo puede inventar cuando un dato requerido falta
- "If the user's prompt doesn't include enough information to fill all the required parameters for a tool, Claude Opus is much more likely to recognize that a parameter is missing and ask for it. Claude Sonnet might ask, especially when prompted to think before outputting a tool request. But it might also infer a reasonable value." (overview)
- "Claude (particularly Claude Sonnet) might guess values you didn't supply" / "This behavior is not guaranteed, especially for more ambiguous prompts and for less capable models." (overview)
- "Allow Claude to say "I don't know": Explicitly give Claude permission to admit uncertainty. This technique can drastically reduce false information." (reduce-hallucinations)
- "Remember, although these techniques significantly reduce hallucinations, they don't eliminate them entirely. Always validate critical information, especially for high-stakes decisions." (reduce-hallucinations)

## Strict garantiza forma, no verdad
- "Setting strict: true on a tool definition guarantees Claude's tool inputs match your JSON Schema" (strict-tool-use) — la garantía es de schema; la doc no dice nada de exactitud del valor.

## Enums
- Clasificación: "For classification tasks, use either tools with an enum field containing your valid labels or structured outputs." (claude-prompting-best-practices)
- Casing: "Structured outputs don't guarantee the capitalization of string enum and const values" / "Compare enum values case-insensitively, and avoid enum values that differ only in capitalization." (structured-outputs)
- "Complex types within enums" → Not supported; "If you use an unsupported feature, you'll receive a 400 error with details." (structured-outputs)

## Opcionales y complejidad
- "Optional parameters | 24 | Total optional parameters across all strict tool schemas and JSON output schemas. Each parameter not listed in required counts toward this limit." (structured-outputs)
- "Reduce optional parameters. Make parameters required where possible. Each optional parameter roughly doubles a portion of the grammar's state space. If a parameter always has a reasonable default, consider making it required and having Claude provide that default explicitly." (structured-outputs)
- "Simplify nested structures. Deeply nested objects with optional fields compound the complexity. Flatten structures where possible." (structured-outputs)

## Orden de propiedades
- "properties in objects maintain their defined ordering from your schema, with one important caveat: required properties appear first, followed by optional properties." (structured-outputs)
- "If property order in the output is important to your application, mark all properties as required, or account for this reordering in your parsing logic." (structured-outputs)

## Objetos sin keys conocidas
- "If you know a field's keys, use a nested Pydantic model, not a dict. The SDK sends a dict field as an object with empty properties, so Claude can only return {} for it." (structured-outputs, Python)
- "The API accepts an object with empty or missing properties, but Claude can only return {} for it." / "If you don't know the keys in advance, use an array instead. Give each item a key and a value" (structured-outputs)
- "required and additionalProperties (must be set to false for objects)" (structured-outputs)

## Ejemplos (few-shot) para opcionales
- input_examples: "Examples are included in the prompt alongside your tool schema, showing Claude concrete patterns for well-formed tool calls. These patterns indicate when to include optional parameters, what formats to use, and how to structure complex inputs." (define-tools)
- "Each example must be valid according to the tool's input_schema. Invalid examples return a 400 error." (define-tools)
- "Examples are one of the most reliable ways to steer Claude's output format, tone, and structure. A few well-crafted examples (known as few-shot or multishot prompting) improve accuracy and consistency." / "Include 3–5 examples for best results." (claude-prompting-best-practices)

## Lo que NO encontré
- La doc no prescribe un valor "unknown"/"other" en los enums ni un campo `ambiguity_notes`: eso es diseño de schema (lo presento como patrón de diseño, apoyado en "Allow Claude to say I don't know" y en que `enum` acepta `null`).
- La doc no dice explícitamente "required + nullable" como receta; lo derivo de: tipos `null` soportados + type arrays `["string","null"]` + tip de reducir opcionales.
