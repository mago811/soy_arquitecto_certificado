---
objective: 31
title: "Qué SÍ y qué NO: criterios explícitos de inclusión y exclusión"
rule: "Decile al modelo exactamente qué categorías reportar y cuáles no (por tipo de hallazgo, por path o por evidencia requerida). Nada de 'sé conservador' ni 'solo lo importante': eso baja todo, incluido lo que querías."
sources:
  - url: https://code.claude.com/docs/en/code-review-customize
    title: "Customize Code Review"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code (Review against your spec)"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices (Be clear and direct)"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
    title: "Prompting Claude Opus 5 (code review)"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project (Write effective instructions)"
status: verificada
---

## Qué es (repaso)

Un modelo al que le pedís "encontrá problemas" siempre encuentra algo. La doc de Claude Code: "A reviewer that's asked to find problems will always find something." Y avisa: si arreglás todo lo que reporta, terminás con "extra abstraction layers and tests for cases that can't happen". Si no le marcás los límites, el review se llena de cosas que no te importan (estilo, naming, "podrías refactorizar").

El fix: **límites explícitos**.

| Tipo de límite | Ejemplo |
|---|---|
| Inclusión por categoría | "Reportá: bugs de lógica, queries sin filtro por tenant, PII en logs" |
| Exclusión por categoría | "No reportes: formato, lint, tipos (lo chequea CI)" |
| Exclusión por path | "Nada en `src/gen/` ni `*.lock`" |
| Vara más alta | "En `scripts/`, solo si es casi seguro y grave" |
| Evidencia requerida | "Afirmaciones de comportamiento necesitan cita `file:line`" |

Para extracción es igual: "Extraé solo montos con moneda explícita; si la moneda no está, no infieras".

## El error típico que el examen quiere que cometas

- **Vago en vez de explícito**: "reportá solo lo importante". ¿Importante según quién? La doc de memoria: escribí instrucciones "concrete enough to verify".
- **"Sé conservador" como exclusión**: la doc de Opus 5 avisa que el modelo puede tomarlo literal "and report less". Bajás falsos positivos y también bugs reales. Mejor excluir **categorías concretas** o reportar todo y filtrar en otra pasada.
- **Excluir toda una categoría útil** porque tuvo algunos falsos: mejor pedir evidencia para esa categoría.
- **Solo decir qué incluir**: sin exclusiones, el modelo rellena con lo que le parece.

## Ejemplo

Antes: `Revisá este PR y reportá problemas.`

Después:

```text
Reportá SOLO:
- bugs que cambian el resultado (cálculos, condiciones, estados)
- queries sin filtro por tenant
- datos personales en logs
NO reportes: estilo, nombres, formato, sugerencias de refactor, tests faltantes.
Para cada hallazgo de comportamiento, citá file:line. Si no podés citarlo, no lo reportes.
```

La doc de Claude Code lo resume en su prompt de review: "report gaps that affect correctness and skip style". Y avisa: "Don't drop the `skip style` part of that prompt."

## Para recordar

- Inclusión + exclusión, las dos explícitas.
- Exclusiones por categoría o por path, no por "nivel de cautela".
- Categoría con falsos positivos → pedí evidencia o subí la vara, no la borres.
- "Sé conservador" = menos recall en todo.
