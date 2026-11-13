---
objective: 26
title: "Lab: un schema que inventa vs un schema que puede decir 'no está'"
minutes: 50
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
    title: "Reduce hallucinations"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
    title: "Tool use with Claude (When required parameters are missing)"
status: no_verificado
---

## Objetivo

Extraer datos de tres facturas (una completa, una sin vencimiento, una ambigua) con dos schemas: uno "todo requerido, todo string" y otro con **nullable**, **enum** con salida de escape e instrucciones + ejemplos con `null`. Comparar cuánto inventa cada uno. Después romper un schema a propósito (`dict` sin keys, enum con objetos).

Modelo: `claude-sonnet-5-5`.

## Pasos

1. Entorno:

```bash
mkdir lab26 && cd lab26
python -m venv .venv && source .venv/bin/activate
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

2. Creá `datos.py`:

```python
FACTURAS = {
    "completa": "Factura A-0001. Fecha 2026-10-01. Vence 2026-10-31. Total ARS 12.500. Pago: transferencia.",
    "sin_vto": "Factura B-0077 de Ferretería Sur. Total USD 300. Abonó con tarjeta Visa.",
    "ambigua": "Factura C-0003. Total 9.999,90 (pesos o dólares según cotización acordada). Pago: a convenir.",
}
```

3. **Schema v1 (el que inventa).** Creá `v1.py`:

```python
import json, anthropic
from datos import FACTURAS

SCHEMA_V1 = {
    "type": "object",
    "properties": {
        "numero": {"type": "string"},
        "vencimiento": {"type": "string"},
        "moneda": {"type": "string"},
        "medio_pago": {"type": "string"},
    },
    "required": ["numero", "vencimiento", "moneda", "medio_pago"],
    "additionalProperties": False,
}

client = anthropic.Anthropic()
for nombre, texto in FACTURAS.items():
    r = client.messages.create(
        model="claude-sonnet-5-5", max_tokens=400,
        messages=[{"role": "user", "content": f"Extraé los datos de esta factura: {texto}"}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA_V1}},
    )
    print(nombre, json.loads(next(b.text for b in r.content if b.type == "text")))
```

Anotá: ¿qué puso en `vencimiento` para `sin_vto`? ¿Qué `moneda` eligió para `ambigua`? ¿Cómo escribió `medio_pago` en cada una ("Visa", "tarjeta", "transferencia bancaria"...)? El schema **lo obliga** a escribir un string en cada campo.

4. **Schema v2 (el honesto).** Creá `v2.py`:

```python
import json, anthropic
from datos import FACTURAS

SCHEMA_V2 = {
    "type": "object",
    "properties": {
        "numero": {"type": "string"},
        "vencimiento": {
            "type": ["string", "null"],
            "description": "YYYY-MM-DD. null si la factura no lo dice. No lo calcules ni lo supongas.",
        },
        "moneda": {
            "type": "string",
            "enum": ["ARS", "USD", "EUR", "ambigua", "no_especificada"],
        },
        "medio_pago": {
            "type": "string",
            "enum": ["transferencia", "tarjeta", "efectivo", "otro", "no_especificado"],
        },
        "nota_ambiguedad": {
            "type": ["string", "null"],
            "description": "Si algún dato es ambiguo, explicá en una frase qué dice el texto. Si no, null.",
        },
    },
    "required": ["numero", "vencimiento", "moneda", "medio_pago", "nota_ambiguedad"],
    "additionalProperties": False,
}

SYSTEM = """Extraés datos de facturas. Nunca inventes ni deduzcas un dato que no está escrito.
Si un dato no aparece, usá null o el valor 'no_especificado'. Si es ambiguo, usá 'ambigua' y explicalo en nota_ambiguedad.

<examples>
<example>
Factura: "Factura Z-1. Total EUR 50."
Salida: {"numero": "Z-1", "vencimiento": null, "moneda": "EUR", "medio_pago": "no_especificado", "nota_ambiguedad": null}
</example>
<example>
Factura: "Factura Z-2. Vence 2026-01-10. Total 100 en pesos o reales."
Salida: {"numero": "Z-2", "vencimiento": "2026-01-10", "moneda": "ambigua", "medio_pago": "no_especificado", "nota_ambiguedad": "El texto dice pesos o reales."}
</example>
</examples>"""

client = anthropic.Anthropic()
for nombre, texto in FACTURAS.items():
    r = client.messages.create(
        model="claude-sonnet-5-5", max_tokens=400, system=SYSTEM,
        messages=[{"role": "user", "content": f"Factura: {texto}"}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA_V2}},
    )
    print(nombre, json.loads(next(b.text for b in r.content if b.type == "text")))
```

Esperás: `sin_vto` → `vencimiento: null`; `ambigua` → `moneda: "ambigua"` con nota; `medio_pago` siempre un valor del enum.

5. **Validá en código igual.** Agregá al final del loop de `v2.py` un chequeo case-insensitive del enum (la doc avisa que la mayúscula de los enums no está garantizada):

```python
    d = json.loads(next(b.text for b in r.content if b.type == "text"))
    assert d["moneda"].lower() in {"ars", "usd", "eur", "ambigua", "no_especificada"}
```

6. **Rompelo 1: `dict` sin keys.** Creá `romper_dict.py` con Pydantic:

```python
import anthropic
from pydantic import BaseModel

class Factura(BaseModel):
    numero: str
    extras: dict

client = anthropic.Anthropic()
r = client.messages.parse(
    model="claude-sonnet-5-5", max_tokens=400, output_format=Factura,
    messages=[{"role": "user", "content": "Factura A-1. Sucursal 3. Vendedor: Ana. Caja 2."}],
)
print(r.parsed_output)
```

`extras` vuelve `{}`: el SDK manda el `dict` como objeto sin `properties` y Claude solo puede devolver `{}`. Fix: un modelo anidado con las keys, o una lista de `{key, value}`.

7. **Rompelo 2: enum con objetos.** En `v2.py` cambiá el enum de `moneda` por `[{"codigo": "ARS"}, {"codigo": "USD"}]`. Esperás un **400** (los enums solo aceptan strings, numbers, booleans o nulls).

## Cómo sabés que salió bien

- Con v1 encontraste al menos un valor inventado o una variante de texto distinta para lo mismo.
- Con v2, `sin_vto` trae `vencimiento: null` y `ambigua` trae `moneda: "ambigua"`.
- `extras` vuelve `{}` y entendés por qué.
- El enum con objetos da 400.

## Si algo falla

- 400 "Schema is too complex for compilation" → menos campos opcionales/union types. Límites de la doc: 24 opcionales y 16 con union types por request.
- v1 no inventa nada en tu corrida → probá con más facturas incompletas; el comportamiento es probabilístico. La doc dice que Sonnet "might also infer a reasonable value".
- `parse()` no existe → `pip install -U anthropic`.
