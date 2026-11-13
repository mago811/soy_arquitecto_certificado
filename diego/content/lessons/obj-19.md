---
objective: 19
title: "Síntesis honesta: lo establecido, lo disputado y lo que no se sabe"
rule: "Si dos fuentes no coinciden, el informe muestra las dos con su fuente y su fecha; nunca promedia ni elige una en silencio."
sources:
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
    title: "Reduce hallucinations"
  - url: https://platform.claude.com/docs/en/build-with-claude/citations
    title: "Citations"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "Claude Certified Architect – Foundations (guía del examen, TS 5.6)"
status: no_verificado
---

## Qué es

Un agente de síntesis junta lo que encontraron varios subagentes y arma un informe. El problema: si una fuente dice "el mercado vale USD 4.200 M" y otra dice "USD 3.100 M", el camino fácil es escribir **una** cifra con tono seguro. Eso borra información: el lector no sabe que hay desacuerdo.

La guía del examen (TS 5.6) pide lo contrario: informes con **secciones explícitas** que separen hallazgos bien establecidos de los disputados, y conflictos **anotados con la fuente** "rather than arbitrarily selecting one value".

## Cuándo se usa

Cada vez que un sistema combina varias fuentes. Las herramientas oficiales para lograrlo:

| Problema | Técnica | Dónde está en la doc |
|---|---|---|
| El modelo "rellena" lo que no sabe | Darle permiso explícito para decir "no tengo información suficiente" | Reduce hallucinations |
| Afirmaciones sin respaldo | Pedir cita por cada afirmación; segunda pasada que retira lo que no tiene cita | Reduce hallucinations |
| Citas armadas a mano que fallan | Citations API: `citations: {"enabled": true}` en cada documento | Citations |
| Se pierde quién dijo qué entre agentes | Que cada subagente guarde hallazgos con fuente y extracto, y pase referencias | Multi-agent research system |
| Diferencias que son de **fecha**, no de fondo | Poner la fecha de cada fuente en la metadata (`<source>`, o el campo `context` del documento) | Prompting best practices / Citations |
| Mismas fuentes, distinta respuesta en cada corrida | Best-of-N: correr varias veces y comparar; la inconsistencia es señal de alucinación | Reduce hallucinations |
| Fuentes flojas que "confirman" algo | Heurísticas de calidad de fuente en el prompt | Multi-agent research system |

## El error típico que el examen quiere que cometas

1. **"Elegí la fuente más reciente" o "promediá".** Suena razonable, pero es decidir en silencio. Lo correcto: mostrar los dos valores, cada uno con su fuente, y marcarlo como disputado.
2. **"Pedile un único número final para que el informe sea claro".** Claridad no es certeza. Colapsar datos en conflicto es exactamente el bug.
3. **"Bajá la temperatura para que no varíe".** Si en cada corrida sale otra cifra, eso es una señal útil. Ocultarla no la arregla.
4. **"Si 5 páginas lo repiten, está establecido".** Cinco granjas de contenido SEO no valen un PDF académico. En el post de Anthropic, los testers vieron justo eso y lo arreglaron con heurísticas de calidad de fuente.
5. **Pedir citas con structured outputs.** Citations y `output_config.format` juntos dan error 400.

## Ejemplo

Prompt de síntesis que conserva la incertidumbre:

```text
Usá SOLO la información de los documentos. No uses conocimiento general.
Armá el informe con tres secciones:
1. Hallazgos establecidos: lo que respaldan dos o más fuentes independientes y de calidad.
2. En disputa: cuando las fuentes no coinciden, mostrá cada valor con su fuente y su fecha. No elijas uno ni promedies.
3. Sin datos suficientes: lo que se preguntó y los documentos no responden. Escribí "No hay información suficiente".
Tené en cuenta la fecha de cada documento: un número de 2019 y otro de 2024 pueden no contradecirse.
```

Con Citations activado en todos los documentos, cada frase del informe vuelve con `cited_text` y `document_title`. La doc dice que así las citas tienen garantizado apuntar a los documentos que pasaste. Después, una segunda pasada: "para cada afirmación, encontrá una cita que la respalde; si no la encontrás, sacala y dejá `[]`".

## Para recordar

- Conflicto entre fuentes creíbles → **las dos cifras, con fuente y fecha**, en "En disputa".
- Permiso para decir "no sé" + "solo con los documentos" = menos invención.
- Citations API > "poné [fuente] al final" a mano. Y no se combina con structured outputs.
- La fecha va en la metadata: muchas "contradicciones" son datos de años distintos.
- Variación entre corridas = alucinación posible. Investigala, no la tapes.
