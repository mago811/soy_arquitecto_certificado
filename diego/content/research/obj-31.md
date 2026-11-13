# Research — Objetivo 31 (criterios explícitos de inclusión y exclusión)

Fecha de lectura: 2026-11-13.

## URLs consultadas

- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
- https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
- https://code.claude.com/docs/en/code-review-customize
- https://code.claude.com/docs/en/code-review
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/memory
- Guía del examen: 4.1 — "The importance of explicit criteria over vague instructions"; "Writing specific review criteria that define which issues to report … versus skip"

## Explícito > vago

- "Claude responds well to clear, explicit instructions. Being specific about the output you want can help enhance results." (claude-prompting-best-practices)
- "Write instructions that are concrete enough to verify" + ejemplos "Use 2-space indentation" instead of "Format code properly" (memory)
- "Providing context or motivation behind your instructions, such as explaining to Claude why such behavior is important..." (claude-prompting-best-practices)
- Success criteria: "Specific: Clearly define what you want to achieve. Instead of “good performance,” specify “accurate sentiment classification.”" (develop-tests)

## Límites de exclusión concretos (review)

- "Comments on generated files or on what CI already checks: list paths and finding categories where Claude should skip findings." (code-review-customize)
- Ejemplo REVIEW.md "## Do not report" con "Anything CI already enforces: lint, formatting, type errors" / "Generated files under `src/gen/` and any `*.lock` file" (code-review-customize)
- "For paths that warrant some review but not full scrutiny, set a higher bar instead: "in `scripts/`, only report if near-certain and severe."" (code-review-customize)
- "Findings that turn out to be wrong: require evidence before a class of finding is posted." (code-review-customize)
- "By default, Code Review focuses on correctness: bugs that would break production, not formatting preferences or missing test coverage." (code-review)
- "A reviewer that's asked to find problems will always find something." / "Don't drop the `skip style` part of that prompt." (best-practices)

## Ojo: exclusiones vagas reducen recall

- "If your review prompt says “only report high-severity issues” or “be conservative,” the model might follow that instruction literally and report less; ask it to report everything and filter in a separate pass instead." (prompting-claude-opus-5)
- → Diferencia clave: un límite por CATEGORÍA/PATH concreto ("no reportes estilo; no reportes `src/gen/`") vs. una orden vaga de "ser conservador" que baja todo.

## Lo que NO encontré textual

- "categories where performance is unreliable" no aparece literal. Lo respalda la idea de "set a higher bar" / "require evidence" para clases de findings que salen mal (code-review-customize).
