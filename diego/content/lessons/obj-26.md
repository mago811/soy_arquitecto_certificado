---
objective: 26
title: "Schemas de extracción que no inventan: opcionales, null y enums"
rule: "Si el dato puede faltar, el schema tiene que poder decir 'falta' (null u opcional); si los valores son fijos, enum (con una salida para 'otro'). Un campo requerido y no-nullable obliga a inventar."
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs (JSON Schema limitations, Property ordering)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
    title: "Tool use with Claude (When required parameters are missing)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
    title: "Define tools (input_examples)"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
    title: "Reduce hallucinations"
status: no_verificado
---

## Qué es

El schema es lo que **le permitís decir** al modelo. Si un campo es requerido y solo acepta `string`, Claude tiene que escribir un string, aunque el documento no lo tenga. Con structured outputs o `strict: true` eso es todavía más duro: la forma está garantizada, así que el valor **aparece sí o sí**.

La doc lo avisa: cuando falta un dato requerido, Claude Opus suele pedirlo, pero Claude Sonnet "might also infer a reasonable value". Inferir un valor razonable, en extracción, es **inventar**.

Tres herramientas para que el modelo pueda decir la verdad:

| Herramienta | Cómo se escribe | Qué le permite decir |
|---|---|---|
| Campo opcional | Fuera de `required` | "No vino este campo" (no aparece) |
| Campo nullable | `"type": ["string", "null"]` | "El campo existe pero el dato no está" (`null`) |
| Enum | `"enum": ["visa", "mastercard", "otro"]` | Solo valores válidos; con `"otro"` no fuerza al más parecido |

La doc confirma que `null` es un tipo soportado, que `enum` acepta "strings, numbers, booleans, or nulls only, no complex types", y que `"type": ["string", "null"]` es una forma válida (cuenta como union type).

## Cuándo se usa

- **El dato puede no estar en el documento** (fecha de vencimiento, email, CUIT) → nullable. Y en el prompt: "si no aparece, devolvé null". La doc de alucinaciones: "Allow Claude to say 'I don't know'... can drastically reduce false information."
- **Valores de un conjunto cerrado** (moneda, método de pago, categoría) → `enum`. Si no, te llega "Visa", "tarjeta", "credit card".
- **El conjunto puede no cubrir todo** → agregá un valor de escape (`"otro"`, `"no_especificado"`) y, si querés, un campo de detalle nullable. Esto es diseño de schema, no un parámetro de la API.
- **El dato es ambiguo** (el contrato dice "30 o 60 días") → dale un lugar para la ambigüedad (null + un campo de nota), en vez de un número obligatorio.

## El error típico que el examen quiere que cometas

- **"Hacé todo `required` para que no falte nada."** Justamente así lo obligás a inventar.
- **"Agregá `strict: true` y listo, ya no inventa."** `strict` garantiza el schema, no la verdad.
- **"Usá un `string` libre, después normalizamos."** Vas a normalizar para siempre. Usá `enum`.
- **"Poné todo opcional."** En strict hay límite: **24** parámetros opcionales en total por request, y **16** con union types (`anyOf` o `["string","null"]`). La doc sugiere marcar como requeridos los que puedas.

Otras trampas de la doc:

- **Orden**: en la salida, "required properties appear first, followed by optional properties". Si tu código depende del orden, marcá todo como requerido o no dependas del orden.
- **`dict` sin keys**: un `dict` en Pydantic se manda como objeto sin `properties` y Claude "can only return {}". Usá un modelo anidado o un array de `{key, value}`.
- **Enums con objetos adentro** → 400 ("Complex types within enums" no está soportado).
- **Mayúsculas**: un enum puede volver con otra mayúscula. Compará sin distinguir mayúsculas.

## Ejemplo

Extracción de facturas. Algunas no tienen vencimiento y el pipeline se llenaba de fechas inventadas.

```json
{
  "type": "object",
  "properties": {
    "numero": {"type": "string"},
    "moneda": {"type": "string", "enum": ["ARS", "USD", "EUR", "otra"]},
    "vencimiento": {
      "type": ["string", "null"],
      "description": "Fecha de vencimiento YYYY-MM-DD. null si la factura no la dice. No la calcules ni la supongas."
    }
  },
  "required": ["numero", "moneda", "vencimiento"],
  "additionalProperties": false
}
```

`vencimiento` es requerido **y** nullable: siempre viene la clave, pero puede ser `null`. Sumá 2–3 ejemplos (few-shot) donde la respuesta correcta tiene `null`. Para tools, `input_examples` le muestra a Claude "when to include optional parameters".

## Para recordar

- Requerido + no-nullable = invitación a inventar.
- `null` = "no está". Opcional = "no aplica / no vino".
- Conjunto cerrado → `enum`, con salida de escape.
- `strict` garantiza forma, no verdad: validá lo crítico.
