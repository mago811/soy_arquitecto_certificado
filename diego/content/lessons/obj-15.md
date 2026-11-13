---
objective: 15
title: "Tests generados que valen: contexto, fixtures y criterios"
rule: "Para que Claude genere buenos tests: mostrale tests existentes como modelo, dejá las convenciones de fixtures y los comandos en CLAUDE.md, y decí qué comportamiento verificar (no 'subí la cobertura')."
sources:
  - url: https://code.claude.com/docs/en/common-workflows
    title: "Common workflows (Work with tests)"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices (Avoid focusing on passing tests)"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (task 3.6)"
status: no_verificado
---

## Qué es (repaso)

Ya lo sabés: pedir "agregá tests" a secas da tests que **pasan pero no prueban nada** (`assert resultado is not None`), que inventan fixtures en vez de usar las del repo, o que siguen otro estilo. Tres palancas:

| Palanca | Dónde va | Qué arregla |
|---|---|---|
| Tests existentes como modelo | En el prompt: `@tests/test_pagos.py` o "seguí el patrón de…" | Estilo, framework, asserts del repo. La doc: Claude "examines your existing test files to match the style" |
| Convenciones de fixtures y comandos | `CLAUDE.md` (persistente) | Usa las fixtures que ya existen y sabe correr un test suelto |
| Criterios de "test que vale" | En el prompt o en `CLAUDE.md` | Pide comportamiento y casos borde, no asserts triviales |

## El error típico que el examen quiere que cometas

- **"Subí la cobertura al 90%"** → la métrica se cumple con asserts vacíos. Pedí **comportamiento**: "be specific about what behavior you want to verify".
- **Explicar las fixtures en cada prompt** → va en `CLAUDE.md`, que se lee en cada sesión (y en CI, si no usás `--bare`).
- **"Hacé que los tests pasen"** → Claude puede acomodar el código al test. La doc de prompting: "Tests are there to verify correctness, not to define the solution."
- **Arreglar cada hallazgo de un reviewer** → "you end up with extra abstraction layers and tests for cases that can't happen".

## Ejemplo

`CLAUDE.md`:

```markdown
## Tests
- Correr uno: pytest tests/test_x.py -q
- Fixtures compartidas en tests/conftest.py: `cliente_demo`, `factura_basica`. Usalas; no crees datos a mano.
- Un test vale si verifica un comportamiento observable (valor, excepción, efecto). No sirven: asserts de "no es None", tests que solo llaman la función.
```

Prompt:

```text
Agregá tests para calcular_mora() siguiendo el estilo de @tests/test_pagos.py.
Casos: pago en término (mora 0), 1 día tarde, monto 0, fecha futura -> ValueError.
Corré los tests y mostrame la salida.
```

## Para recordar

- Modelo de estilo = tests existentes (`@archivo`).
- Fixtures y comandos = `CLAUDE.md`.
- Criterio = comportamiento + bordes, no cobertura ni "que pase".
