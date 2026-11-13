---
objective: 12
title: "Refinar en vueltas: ejemplos concretos, feedback puntual y problemas en lote"
rule: "Para mejorar un resultado en vueltas: mostrá ejemplos reales de entrada→salida, decí exactamente qué falló y dónde, y si los problemas están relacionados mandalos todos juntos en un solo mensaje (o /clear + un prompt nuevo que los junte)."
sources:
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
    title: "Increase output consistency"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
    title: "Reduce hallucinations (Iterative refinement)"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (task 3.5: iterative refinement)"
status: verificada
---

## Qué es

Le pedís a Claude algo (una función de parseo, un prompt de extracción, un componente) y la primera versión no es perfecta. **Refinamiento iterativo** es cómo hacés las vueltas siguientes para que cada una mejore de verdad, en vez de dar vueltas en círculo.

Tres herramientas:

| Herramienta | Qué es | Por qué funciona |
|---|---|---|
| **Ejemplos input → output** | "Para `'1.234,50'` espero `1234.5`; para `'USD 10'` espero `10.0`" | La doc: los ejemplos son "more effective than abstract instructions" |
| **Feedback puntual** | "Falla con montos negativos entre paréntesis `(500)`: devuelve 500, debería ser -500" | Nombrás el caso, el síntoma y qué es "arreglado" |
| **Problemas en lote** | Mandar los 4 casos que fallan juntos, en un mensaje | Criterio del examen (task 3.5), no literal en la doc. Lo que la doc sí dice: tras dos correcciones fallidas, `/clear` + "one new prompt that folds in what you learned" |

Y un cuarto ingrediente que lo hace andar solo: **un check que devuelva pass/fail** (tests, un script que compara contra un fixture). La doc: "If you give it something that comes back pass or fail, Claude can close that loop itself."

## Cuándo se usa

- **El resultado tiene un formato o transformación difícil de describir** → mostrale 3–5 pares entrada/salida reales, incluidos los casos raros.
- **Falló un caso específico** → decí cuál, qué devolvió y qué esperabas. No "está mal, mejoralo".
- **Hay varios fallos que se pisan entre sí** (normalizar fechas y monedas en el mismo parser) → listalos todos en un mensaje, así Claude ve el conjunto.
- **Ya corregiste dos veces lo mismo y sigue mal** → la doc: "after two failed corrections run `/clear` and write a better prompt instead of a third". El prompt nuevo junta todo lo que aprendiste.
- **Lote grande (muchos archivos)** → "Try it on three files first, see what goes wrong, fix the prompt, then run the rest."

## El error típico que el examen quiere que cometas

1. **Feedback vago**: "No me gusta, hacelo mejor" o "fijate los edge cases". Claude no sabe qué falló.
2. **Describir en vez de mostrar**: tres párrafos sobre el formato de salida, cuando dos ejemplos lo dicen solos.
3. **Arreglar de a un bug cuando están conectados**: arreglás fechas, se rompe moneda; arreglás moneda, vuelve fechas. Mandá todos juntos.
4. **Tercera corrección en el mismo hilo**: la conversación ya tiene dos intentos fallidos "for Claude to keep re-reading". Mejor `/clear` + un prompt que junte todo.
5. **Confiar en "todos los tests pasan"**: pedí evidencia, el comando que corrió y su salida.

## Ejemplo

Diego le pide a Claude Code un `parsear_monto(texto)` para extractos bancarios.

Vuelta 1 (mal): "Hacé una función que parsee montos de los extractos."

Vuelta 2 (bien), en un solo mensaje:

```text
parsear_monto falla en estos 4 casos de tests/fixtures/montos.csv:
  "1.234,50"  -> devolvió 1.2345  -> espero 1234.5
  "(500,00)"  -> devolvió 500.0   -> espero -500.0
  "USD 10"    -> lanzó ValueError -> espero 10.0
  ""          -> devolvió 0.0     -> espero None
Los 4 son del mismo problema: el formato es argentino (punto de miles, coma decimal)
y los negativos van entre paréntesis. Arreglalos juntos, corré
`pytest tests/test_montos.py` y mostrame la salida.
```

Ahí hay: ejemplos concretos, feedback por caso, todos en lote, y un check que devuelve pass/fail.

## Para recordar

- Mostrá, no describas: pares entrada → salida reales.
- Feedback = caso + qué hizo + qué esperabas.
- Problemas relacionados → un solo mensaje con todos.
- Dos correcciones fallidas → `/clear` + prompt nuevo con lo aprendido.
- Dale un check pass/fail y pedile la evidencia.
