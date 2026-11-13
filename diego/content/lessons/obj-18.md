---
objective: 18
title: "Qué devuelve un subagente: datos, prosa y citas, cada uno en su lugar"
rule: "Los datos van en campos tipados (con schema validado), la explicación en un campo de prosa aparte, y cada afirmación lleva su fuente (URL, documento, página, fecha) pegada; lo que puede faltar, opcional."
sources:
  - url: https://code.claude.com/docs/en/agent-sdk/structured-outputs
    title: "Get structured output from agents"
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/build-with-claude/citations
    title: "Citations"
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (PDF linkeado desde esta página), Task Statement 5.6"
status: verificada
---

## Qué es

Lo que un subagente devuelve lo va a leer **otro agente** (el sintetizador) o **tu código** (el que arma el informe). Si devuelve un párrafo lindo pero mezclado, abajo se pierde todo: cifras, fuentes, fechas.

Un buen schema de salida separa tres cosas:

| Parte | Formato | Para qué |
|---|---|---|
| Datos | Campos tipados: números, enums, arrays | Que el código o la síntesis los use sin parsear texto |
| Resumen | Un campo `string` de prosa | El "qué significa", para leer |
| Citas | Por hallazgo: `source_url`, `document_name`, `page`, `excerpt`, `publication_date` | Que la atribución sobreviva a la síntesis |

La guía del examen pide justo eso: mapeos afirmación→fuente que los agentes de abajo **preserven**, fechas de publicación para no confundir "dato viejo" con "contradicción", y valores en conflicto **anotados**, no elegidos al azar. También pide renderizar según el tipo: datos financieros como tabla, noticias como prosa, hallazgos técnicos como lista.

## Cuándo se usa: las herramientas reales

**Agent SDK.** Pasás `output_format={"type": "json_schema", "schema": ...}` (TS: `outputFormat`) y leés `structured_output` del result message. El SDK valida y re-pregunta si no matchea. Ojo:

- `AgentDefinition` **no tiene** un campo de schema. Si un "worker" tiene que devolver JSON garantizado, corrélo como su propio `query()` con `output_format`. Si lo dejás como subagente, el formato va pedido en su prompt (guía, no garantía).
- Si el dato puede no estar, el campo va **opcional**. Si no, el agente inventa o se agotan los reintentos (`error_max_structured_output_retries`).
- `success` solo no alcanza: chequeá también `is_error` y que exista `structured_output`.

**API.** `output_config.format` garantiza el schema por decodificación restringida. Pero **es incompatible con Citations**: si activás citations en documentos y mandás `output_config.format`, la API devuelve 400. Para datos con cita por campo, la doc dice: pedí una línea por campo (`campo: valor`), con citations activas, y parseá las líneas en tu código.

**Salidas grandes.** Anthropic recomienda que los subagentes guarden su trabajo en un sistema externo (archivos) y devuelvan una **referencia liviana** al coordinador, para evitar el "teléfono descompuesto" de copiar todo por la conversación.

## El error típico que el examen quiere que cometas

- "Que el subagente devuelva un único `summary` con todo": la síntesis no puede separar afirmación de fuente.
- "Hacer `publication_date` obligatorio para forzar que la busque": el modelo la inventa o falla la validación. Opcional (o nullable) y que diga que no la encontró.
- "Activar Citations y además `output_config.format` para tener las dos cosas": 400.
- "Pedir 'devolvé SOLO JSON' con citations activas": la request anda, pero vienen pocas o ninguna cita.
- "Que el coordinador reescriba los informes de los subagentes": si querés el texto literal, pedilo en el prompt del `query()` principal; si no, el padre puede resumirlo.

## Ejemplo

Schema para el subagente de análisis de documentos (JSON Schema draft-07, que es lo que valida el SDK):

```json
{
  "type": "object",
  "properties": {
    "resumen": { "type": "string" },
    "hallazgos": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "afirmacion": { "type": "string" },
          "valor": { "type": "number" },
          "unidad": { "type": "string" },
          "extracto": { "type": "string" },
          "source_url": { "type": "string" },
          "documento": { "type": "string" },
          "pagina": { "type": "integer" },
          "publication_date": { "type": "string" },
          "estado": { "type": "string", "enum": ["consolidado", "en_disputa"] }
        },
        "required": ["afirmacion", "extracto", "documento", "estado"]
      }
    }
  },
  "required": ["resumen", "hallazgos"]
}
```

`valor`, `pagina` y `publication_date` no son obligatorios porque no siempre existen. El sintetizador puede armar una tabla con los `valor`, prosa con el `resumen`, y marcar los `en_disputa` en su propia sección.

## Para recordar

- Datos tipados + prosa aparte + cita por hallazgo.
- SDK: `output_format` → `structured_output`. `AgentDefinition` no trae schema.
- Lo que puede faltar → opcional. Nunca forzar a inventar.
- API: structured outputs + citations = 400. Cita por campo = una línea por campo y parseás vos.
- Metadatos largos de un documento → campo `context` del documento (el `title` es corto).
- Salidas grandes → archivo + referencia liviana.
