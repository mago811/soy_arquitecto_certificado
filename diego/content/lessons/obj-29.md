---
objective: 29
title: "Extracción precisa en documentos variados: schema honesto, formato explícito y ejemplos"
rule: "Para que una extracción no invente y sea consistente: campos que pueden faltar como opcionales/nullable, instrucciones de formato explícitas (fechas, montos) y 3–5 ejemplos variados que incluyan casos con datos faltantes."
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
    title: "Reduce hallucinations"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
    title: "Increase output consistency"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices (Use examples effectively)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
    title: "Tool use (missing required parameters)"
status: no_verificado
---

## Qué es (repaso)

Extraés datos de remitos de 30 proveedores. Cada uno tiene otro formato: fechas `03/08/26`, `3-ago-2026`, `2026-08-03`; montos `1.234,50` y `1,234.50`; a veces falta el CUIT. Tres patrones juntos:

| Patrón | Qué hace | Qué evita |
|---|---|---|
| **Schema con opcionales / nullable** | `"type": ["string", "null"]` o el campo fuera de `required` | Que invente un CUIT para llenar un campo obligatorio |
| **Instrucciones de normalización** | "Fechas en `YYYY-MM-DD`; montos como número con punto decimal; si el año viene con 2 dígitos, es 20XX" | Que cada documento salga en su propio formato |
| **Few-shot variado** | 3–5 pares documento → JSON, incluido uno con `null` | Que no sepa qué hacer cuando falta algo o el formato es raro |

Clave: structured outputs garantiza la **forma** ("Type safe: Guaranteed field types and required fields"), no la **verdad**. Si el campo es obligatorio y el dato no está, el modelo igual tiene que poner algo. La doc de tool use: puede "infer a reasonable value".

## El error típico que el examen quiere que cometas

- **"Usá structured outputs y listo"** → el JSON es válido y el CUIT es inventado.
- **"Agregá 'no inventes' en mayúsculas"** sin darle una salida (`null`) → el schema lo obliga igual.
- **Ejemplos todos completos y del mismo proveedor** → no aprende el caso "falta" ni los otros formatos. La doc: "Diverse: Cover edge cases".
- **Usar `minLength`/`maximum` para validar** → no están soportados en el schema de structured outputs (400). Validá en tu código.
- **Normalizar "a ojo" en el post-proceso** sin decirle al modelo el formato → cada documento sale distinto.

## Ejemplo

```json
{ "type": "object",
  "properties": {
    "fecha":  {"type": "string", "format": "date"},
    "cuit":   {"type": ["string", "null"]},
    "moneda": {"type": "string", "enum": ["ARS", "USD", "desconocida"]},
    "total":  {"type": "number"} },
  "required": ["fecha", "cuit", "moneda", "total"],
  "additionalProperties": false }
```

Prompt: "Usá solo lo que está en el documento. Si un dato no aparece, `null`. Fechas en `YYYY-MM-DD`. Montos: `1.234,50` → `1234.5`." + 4 ejemplos (uno sin CUIT, uno en USD, uno con fecha `3-ago-26`, uno completo).

## Para recordar

- Schema = forma. Opcional/nullable = permiso para decir "no está".
- Normalización: decí el formato de salida exacto.
- Few-shot: variado, con casos borde y con `null`.
- Validaciones de rango/largo → en tu código, no en el schema.
