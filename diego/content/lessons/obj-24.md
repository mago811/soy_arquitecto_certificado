---
objective: 24
title: "Una pasada por tema: seguridad, negocio y API en prompts separados"
rule: "Si un solo prompt de review mezcla seguridad, lógica de negocio y diseño de API, partilo: una pasada por tema, cada una con sus propios criterios y sus propios ejemplos, y juntá los resultados en código."
sources:
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
    title: "Increase output consistency (Chain prompts for complex tasks)"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices (Use examples effectively, Chain complex prompts)"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
    title: "Prompting Claude Opus 5 (code review)"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/code-review
    title: "Code Review"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (task 4.6: multi-instance and multi-pass review)"
status: no_verificado
---

## Qué es

Tenés un bot que revisa PRs. Hoy usa **un solo prompt gigante** que dice: "buscá problemas de seguridad, errores de lógica de negocio y malas decisiones de diseño de API". Y trae ejemplos de los tres temas mezclados.

Resultado típico: encuentra bastante de un tema (por ejemplo, estilo de API) y **se le escapan** cosas del otro (una inyección SQL). No es que "no sepa": es que tiene que repartir la atención entre criterios distintos que compiten.

La solución es **una pasada por tema**:

| Pasada | Qué mira | Sus ejemplos (few-shot) |
|---|---|---|
| Seguridad | inyección, authz, secretos, PII en logs | 3–5 casos de vulnerabilidades reales del repo |
| Lógica de negocio | reglas de precios, estados, cálculos | 3–5 casos de bugs de negocio |
| Diseño de API | contratos, versionado, códigos de error | 3–5 casos de endpoints mal diseñados |

Cada pasada es una llamada (o un subagente) con **su** prompt, **sus** criterios y **sus** ejemplos. Después, tu código junta los hallazgos, saca duplicados y los ordena.

La doc lo dice así: "Break down complex tasks into smaller, consistent subtasks. Each prompt then covers a single subtask, reducing inconsistency errors across scaled workflows." Y sobre ejemplos: tienen que ser "Relevant: Mirror your actual use case closely". Un ejemplo de seguridad no le enseña nada a la pasada de API.

<!-- La idea de "recall trade-off entre temas que compiten" es el framing del objetivo; la doc respalda partir en subtareas y few-shot relevante, pero no usa esas palabras. -->

## Cuándo se usa

- El review de un solo prompt **se pierde un tema** de forma consistente (siempre falla en seguridad, por ejemplo).
- Querés **ejemplos distintos** para cada tema: si los mezclás en un solo prompt, el modelo puede copiar patrones que no corresponden.
- Querés **medir** cada tema por separado (cuántos falsos positivos tiene la pasada de seguridad vs. la de API). Con chaining cada paso es "a separate API call so you can log, evaluate, or branch at any point".
- En Claude Code: subagentes en `.claude/agents/` (por ejemplo `security-reviewer.md`, `api-reviewer.md`). Cada uno "runs in its own context window with a custom system prompt, specific tool access, and independent permissions".

## El error típico que el examen quiere que cometas

1. **"Agregá más instrucciones y más ejemplos al mismo prompt."** Suena lógico, pero agranda la mezcla. El problema es que compiten, no que falte texto.
2. **"Pedile que sea conservador / que solo reporte lo grave."** Eso baja todo, incluido lo que sí querías. La doc de Opus 5 avisa: el modelo "might follow that instruction literally and report less; ask it to report everything and filter in a separate pass instead".
3. **"Corré el mismo prompt mezclado tres veces y uní resultados."** Repetir no separa los temas: la competencia sigue en cada corrida.
4. **"Subí el effort / usá un modelo más grande."** Puede ayudar un poco, pero no arregla un prompt que mezcla criterios.

## Ejemplo

Fintech con un review en GitHub Actions que se pierde los `SELECT` sin filtro por tenant.

Antes: un prompt "revisá todo" con 6 ejemplos mezclados.

Después:

```text
Pasada 1 (security): "Revisá SOLO seguridad: inyección, authz, datos de otro tenant..."
  <examples> 4 hallazgos de seguridad reales del repo + 1 caso limpio </examples>
Pasada 2 (business): "Revisá SOLO lógica de negocio: cálculo de intereses, estados..."
  <examples> 4 bugs de negocio + 1 caso limpio </examples>
Pasada 3 (api): "Revisá SOLO diseño de API: contratos, errores, versionado..."
  <examples> 4 problemas de API + 1 caso limpio </examples>
Merge en código: unir arrays, dedupe por archivo+línea, ordenar por severidad.
```

Cada pasada devuelve el mismo formato de hallazgo (JSON), así el merge es simple.

El servicio **Code Review** de Claude Code ya trabaja parecido: "several agents examine the diff and the surrounding code in parallel" y después "a verification step checks the candidate findings against the code and filters out false positives".

## Para recordar

- Un prompt = un tema. Varios temas = varias pasadas.
- Cada pasada lleva **sus propios** ejemplos (3–5, relevantes, en `<examples>`).
- Mismo formato de salida en todas → merge y dedupe en código.
- "Sé conservador" no es separar: baja el recall de todo. Reportá todo y filtrá en otra pasada.
- En Claude Code: un subagente por tema, con su system prompt y `tools: Read, Grep, Glob`.
