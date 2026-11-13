# Research — Objetivo 29 (precisión de extracción: schemas con opcionales, normalización, few-shot)

Fecha de lectura: 2026-11-13. Complementa research/obj-26.md.

## URLs consultadas

- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Guía del examen: "The effectiveness of few-shot examples for reducing hallucination in extraction tasks" (4.2)

## Schema: forma garantizada, no verdad

- "Always valid: No JSON parsing errors" / "Type safe: Guaranteed field types and required fields" (structured-outputs)
- Nullable: "Parameters with union types | 16 | Total parameters that use `anyOf` or type arrays (for example, `"type": ["string", "null"]`) across all strict schemas." (structured-outputs)
- "`enum` (strings, numbers, booleans, or nulls only, no complex types)." (structured-outputs)
- "Optional parameters | 24 | ... Each parameter not listed in `required` counts toward this limit." (structured-outputs)
- "Structured outputs don't guarantee the capitalization of string `enum` and `const` values" / "Compare enum values case-insensitively, and avoid enum values that differ only in capitalization." (structured-outputs)
- String formats soportados: "`date-time`, `time`, `date`, `duration`, `email`, `hostname`, `uri`, `ipv4`, `ipv6`, `uuid`" (structured-outputs)
- No soportado: "Numerical constraints (such as `minimum`, `maximum`, `multipleOf`)" y "String constraints (`minLength`, `maxLength`)" (structured-outputs)

## Inventar cuando falta

- "If the user's prompt doesn't include enough information to fill all the required parameters for a tool, Claude Opus is much more likely to recognize that a parameter is missing and ask for it. Claude Sonnet might ask, especially when prompted to think before outputting a tool request. But it might also infer a reasonable value." (tool-use overview)
- "Allow Claude to say “I don’t know”: Explicitly give Claude permission to admit uncertainty. This technique can drastically reduce false information." (reduce-hallucinations)
- "Explicitly instruct Claude to only use information from provided documents and not its general knowledge." (reduce-hallucinations)
- "Use direct quotes for factual grounding: For tasks involving long documents (>20k tokens), ask Claude to extract word-for-word quotes first before performing its task." (reduce-hallucinations)

## Few-shot y formato

- "Examples are one of the most reliable ways to steer Claude’s output format, tone, and structure. A few well-crafted examples (known as few-shot or multishot prompting) improve accuracy and consistency." (claude-prompting-best-practices)
- "Diverse: Cover edge cases and vary enough that Claude doesn’t pick up unintended patterns." (claude-prompting-best-practices)
- "Provide examples of the output you want. This is more effective than abstract instructions." (increase-consistency)
- "Precisely define the output format you want using JSON, XML, or custom templates so that Claude follows every output formatting element you require." (increase-consistency)
- "Providing context or motivation behind your instructions, such as explaining to Claude why such behavior is important, can give Claude more information about your goals and help it deliver more targeted responses." (claude-prompting-best-practices)

## Lo que NO encontré textual

- "format normalization instructions" no aparece con esas palabras. Se respalda con "Be specific about the output format and constraints you want." (claude-prompting-best-practices) y con los string formats (`date`) de structured-outputs.
