# Research — Objetivo 15 (tests generados de mejor calidad)

Fecha de lectura: 2026-11-13.

## URLs consultadas

- https://code.claude.com/docs/en/common-workflows
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/github-actions
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Guía del examen: 3.6 — "Documenting testing standards, valuable test criteria, and available fixtures in CLAUDE.md"

## Tests existentes como contexto

- "Claude can generate tests that follow your project's existing patterns and conventions. When asking for tests, be specific about what behavior you want to verify. Claude examines your existing test files to match the style, frameworks, and assertion patterns already in use." (common-workflows)
- "To improve coverage, ask Claude to identify edge cases you might have missed. Claude can analyze your code paths and suggest tests for error conditions, boundary values, and unexpected inputs that are often overlooked." (common-workflows)
- Pasos de la receta: "find functions in NotificationsService.swift that are not covered by tests", "add tests for the notification service", "add test cases for edge conditions in the notification service", "run the new tests and fix any failures" (common-workflows)
- "follow the pattern in HotDogWidget.php..." / "If you already have the thing Claude needs, hand it over instead of describing it" (best-practices)

## Convenciones persistentes (fixtures, comandos) en CLAUDE.md

- "How to confirm work in this repo: the exact test, typecheck, and lint commands, and how to run a single test file" (best-practices, qué poner en CLAUDE.md)
- Ejemplo de CLAUDE.md corto: "Run one test file: pnpm vitest run path/to/file.test.ts" y "Integration tests need DATABASE_URL set, see .env.example" (best-practices)
- "Create this file and add instructions that apply to anyone working on the project: build and test commands, coding standards, architectural decisions, naming conventions, and common workflows." (memory)
- "Write instructions that are concrete enough to verify" / "Run `npm test` before committing" instead of "Test your changes" (memory)

## Criterios: tests de comportamiento, no triviales

- "Tests are there to verify correctness, not to define the solution." (claude-prompting-best-practices, "Avoid focusing on passing tests and hardcoding")
- "Do not hard-code values or create solutions that only work for specific test inputs." (claude-prompting-best-practices)
- "A reviewer that's asked to find problems will always find something. If you fix every finding, you end up with extra abstraction layers and tests for cases that can't happen." (best-practices)
- Reviewer: "check every requirement is implemented and the listed edge cases have tests" (best-practices)

## Lo que NO encontré textual

- "trivial assertions" / "fixture conventions" no aparecen literal en la doc; la parte de "documentar fixtures en CLAUDE.md" es de la guía del examen. Las preguntas usan citas de common-workflows / best-practices / memory.
