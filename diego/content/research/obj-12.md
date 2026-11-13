# Research — Objetivo 12 (refinamiento iterativo: ejemplos input/output, feedback puntual, issues en lote)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/common-workflows
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
- Guía del examen: task 3.5 "Apply iterative refinement techniques for progressive improvement"

## Ejemplos concretos de entrada/salida > descripciones

- "Provide examples of the output you want. This is more effective than abstract instructions." (increase-consistency)
- "Examples are one of the most reliable ways to steer Claude’s output format, tone, and structure." (claude-prompting-best-practices)
- "Include 3–5 examples for best results. You can also ask Claude to evaluate your examples for relevance and diversity, or to generate additional ones based on your initial set." (claude-prompting-best-practices)
- "If you already have the thing Claude needs, hand it over instead of describing it" (best-practices)
- "A file: type `@` and the path to include the file contents in your message." (best-practices)
- "follow the pattern in HotDogWidget.php and build a calendar widget..." (best-practices, tabla "Instead of / Try")

## Feedback específico sobre la falla

- "A specific prompt helps for the same reason, because it gives Claude information it doesn't already have. If you name the file, describe the symptom, and say what "fixed" looks like up front, you usually save yourself a round of corrections later." (best-practices)
- "Think of Claude as a brilliant but new employee who lacks context on your norms and workflows. The more precisely you explain what you want, the better the result." (claude-prompting-best-practices)
- Opus 5.5 frontend: "It responds well to instructions that name specific patterns to avoid, as in the following example. Work iteratively: check which styles the first result used instead, and extend the list if needed." (prompting-claude-opus-5-5)

## Ciclo con un check que devuelve pass/fail

- "If you give it something that comes back pass or fail, Claude can close that loop itself. It makes the change, runs the check, and if something broke it reads the output and fixes it before running the check again." (best-practices)
- Lista de checks: "A test file", "A build's exit code", "A linter", "A script that diffs output against a fixture" (best-practices)
- "Whichever option you use, ask Claude for evidence: the command it ran and its output, or the screenshot." (best-practices)

## Cuándo dejar de corregir de a uno y consolidar

- "Watch the first minute, press `Esc` the moment Claude drifts, and after two failed corrections run `/clear` and write a better prompt instead of a third." (best-practices)
- "If you've corrected the same thing twice and it's still wrong, a third correction mostly adds to a conversation that already contains two failed attempts for Claude to keep re-reading. `/clear` plus one new prompt that folds in what you learned works better almost every time." (best-practices)
- "Try it on three files first, see what goes wrong, fix the prompt, then run the rest." (best-practices)

## Self-correction / refinamiento con API

- "The most common chaining pattern is self-correction: generate a draft → have Claude review it against criteria → have Claude refine based on the review. Each step is a separate API call so you can log, evaluate, or branch at any point." (claude-prompting-best-practices)
- "Iterative refinement: Use Claude’s outputs as inputs for follow-up prompts, asking it to verify or expand on previous statements. This can catch and correct inconsistencies." (reduce-hallucinations)

## Tests en common-workflows

- "Claude can generate tests that follow your project's existing patterns and conventions. When asking for tests, be specific about what behavior you want to verify." (common-workflows)

## Lo que NO encontré textual

- "batched issue descriptions for consolidated evaluation" no aparece literal. Lo más cercano: "`/clear` plus one new prompt that folds in what you learned" y "Try it on three files first, see what goes wrong, fix the prompt, then run the rest" (best-practices). La idea de "mandar todos los problemas juntos cuando interactúan entre sí" es framing del objetivo/examen; en las preguntas la apoyo con esas citas.
