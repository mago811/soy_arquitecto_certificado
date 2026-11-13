---
objective: 30
title: "Menos falsos positivos: convenciones del proyecto en contexto persistente"
rule: "Si el review automático marca cosas que tu equipo acepta, no lo arregles en el prompt de cada corrida: poné convenciones, patrones aceptados y exclusiones en un archivo que se lee en TODOS los reviews (CLAUDE.md o REVIEW.md, según la herramienta)."
sources:
  - url: https://code.claude.com/docs/en/code-review-customize
    title: "Customize Code Review"
  - url: https://code.claude.com/docs/en/code-review
    title: "Code Review"
  - url: https://code.claude.com/docs/en/code-review-local
    title: "Review locally with /code-review"
  - url: https://code.claude.com/docs/en/github-actions
    title: "Claude Code GitHub Actions"
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically (bare mode)"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
status: no_verificado
---

## Qué es

Un **falso positivo** es un hallazgo que no es un problema para tu equipo. Ejemplos: "usá `async/await` en vez de callbacks" en un módulo legacy que acordaron no tocar; comentarios sobre archivos generados; quejas de formato que ya chequea el linter.

El modelo no conoce tus acuerdos. Si no se los decís **en cada review**, los vuelve a marcar. El fix es darle esas reglas como **contexto persistente**: un archivo del repo que la herramienta lee siempre.

| Herramienta | Qué archivo lee | Notas |
|---|---|---|
| Servicio **Code Review** (GitHub, Team/Enterprise) | `CLAUDE.md` + `REVIEW.md` | `REVIEW.md` = "instructions for reviews alone". Se lee de la rama base/default, nunca del PR |
| `/code-review` local (o con `-p`) | `CLAUDE.md` | **No** lee `REVIEW.md` |
| GitHub Actions (`claude-code-action`) | `CLAUDE.md` | La doc: definí "review criteria, project-specific rules, and preferred patterns" ahí |
| `claude -p --bare` en CI | **nada** de eso | `--bare` se saltea CLAUDE.md; pasá el contexto con `--append-system-prompt` |

## Cuándo se usa

Según la doc de Customize Code Review, cada síntoma tiene su instrucción:

- **Comentarios en archivos generados o en lo que CI ya chequea** → "list paths and finding categories where Claude should skip findings" (lockfiles, `src/gen/`, lint).
- **Demasiados nits** → poné un tope: "Report at most five Nits per review."
- **Hallazgos que resultan falsos** → "require evidence before a class of finding is posted". Ej.: "behavior claims need a `file:line` citation".
- **Carpetas que merecen menos escrutinio** → "in `scripts/`, only report if near-certain and severe."
- **Lo marca como Important y no lo es** → redefiní qué es Important en tu repo.

Regla de reparto: `REVIEW.md` solo para lo que cambia el comportamiento del review; el contexto general del proyecto, en `CLAUDE.md`. Y si querés que algo valga **también** en `/code-review` local, va en `CLAUDE.md`.

## El error típico que el examen quiere que cometas

1. **Arreglarlo en el prompt de una corrida.** "Le aclaro en el comentario `@claude review` que ignore `src/gen/`". Funciona una vez. El objetivo dice "persistent context applied on every review".
2. **Poner las exclusiones en `REVIEW.md` y esperar que `/code-review` local las use.** No lo lee.
3. **Editar `REVIEW.md` dentro del mismo PR y esperar efecto en ese PR.** Se lee de la rama base o default, "never from the pull request's own changes". Primero mergeás el cambio.
4. **Usar `--bare` en CI y preguntarte por qué ignora tu CLAUDE.md.** `--bare` lo saltea a propósito.
5. **"Sé conservador".** Baja todo el recall. Mejor exclusiones concretas por categoría o por path.
6. **Meter exclusiones en una Skill incluida en `REVIEW.md`.** La doc: "Write exclusions and Nit caps in `REVIEW.md` or a file beside it, not in an included skill."

## Ejemplo

Equipo con monorepo. El bot marca: `*.lock`, código en `src/gen/`, el patrón `Result<T, E>` (que es su convención aceptada) y nits de estilo.

`CLAUDE.md` (vale para todo, incluido `/code-review` local):

```markdown
## Convenciones
- Los errores de dominio se devuelven como Result<T, E>, no con throw. Es el patrón aceptado.
```

`REVIEW.md` (solo el servicio Code Review, en la rama default protegida):

```markdown
## Do not report
- Generated files under `src/gen/` and any `*.lock` file
- Anything CI already enforces: lint, formatting, type errors

## Cap the nits
Report at most five Nits per review.

## Evidence
Behavior claims need a `file:line` citation, not an inference from naming.
```

Se mergea a `main` (protegida). Desde el próximo PR, todos los reviews lo aplican.

## Para recordar

- Falsos positivos repetidos = falta contexto persistente, no "un modelo más estricto".
- Servicio Code Review: `CLAUDE.md` + `REVIEW.md`. `/code-review` local: solo `CLAUDE.md`. GitHub Actions: `CLAUDE.md`.
- `REVIEW.md` se lee de la rama base/default. Mergealo antes.
- Exclusiones concretas (paths, categorías, pedir evidencia) > "sé conservador".
- `--bare` = sin CLAUDE.md. Si lo usás, pasá las reglas con `--append-system-prompt`.
