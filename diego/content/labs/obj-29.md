---
objective: 29
title: "Lab (repaso): remitos de tres proveedores, un solo formato de salida"
minutes: 30
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
    title: "Reduce hallucinations"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
status: verificada
---

## Objetivo

Extraer fecha, CUIT, moneda y total de tres remitos con formatos distintos. Versión 1: schema todo obligatorio y prompt mínimo. Versión 2: nullable + normalización explícita + ejemplos variados. Comparar.

Modelo: `claude-opus-5-5`, `max_tokens` 4000 (el thinking cuenta).

## Pasos

1. Entorno: `python -m venv .venv && source .venv/bin/activate && pip install anthropic` y `export ANTHROPIC_API_KEY=...`.

2. `lab.py`:

```python
import json, sys, anthropic
client = anthropic.Anthropic()
DOCS = {
  "sur":   "REMITO 0001-0045 | Fecha: 03/08/26 | CUIT 30-71234567-8 | Total $ 1.234,50",
  "norte": "Delivery note #77 - Aug 3, 2026 - Amount: USD 1,234.50 - Tax ID not provided",
  "este":  "Remito 12. 3-ago-2026. Importe: (500,00) pesos. Proveedor: Ferretería Este.",
}
V1 = {"type": "object", "properties": {"fecha": {"type": "string"}, "cuit": {"type": "string"},
      "moneda": {"type": "string"}, "total": {"type": "number"}},
      "required": ["fecha", "cuit", "moneda", "total"], "additionalProperties": False}
V2 = {"type": "object", "properties": {"fecha": {"type": "string", "format": "date"},
      "cuit": {"type": ["string", "null"]}, "moneda": {"type": "string", "enum": ["ARS", "USD", "desconocida"]},
      "total": {"type": "number"}},
      "required": ["fecha", "cuit", "moneda", "total"], "additionalProperties": False}
SYS_V2 = """Extraé datos usando SOLO lo que dice el documento. Si un dato no aparece, devolvé null.
Formato: fecha YYYY-MM-DD (años de 2 dígitos = 20XX; dd/mm). Montos como número con punto decimal:
"1.234,50" -> 1234.5, "1,234.50" -> 1234.5, "(500,00)" -> -500.0. "$" o "pesos" -> ARS.
<examples>
<example>"Fact. 9 - 15/01/26 - CUIT 20-12345678-9 - $ 10,00" -> {"fecha":"2026-01-15","cuit":"20-12345678-9","moneda":"ARS","total":10.0}</example>
<example>"Invoice 3 - Jan 2, 2026 - USD 7.00 - no tax id" -> {"fecha":"2026-01-02","cuit":null,"moneda":"USD","total":7.0}</example>
<example>"Nota 4. 1-feb-2026. Importe (20,50)" -> {"fecha":"2026-02-01","cuit":null,"moneda":"desconocida","total":-20.5}</example>
</examples>"""

def extraer(doc, schema, system=None):
    kw = {"system": system} if system else {}
    r = client.messages.create(model="claude-opus-5-5", max_tokens=4000,
        messages=[{"role": "user", "content": f"<documento>{doc}</documento>"}],
        output_config={"format": {"type": "json_schema", "schema": schema}}, **kw)
    return json.loads(next(b.text for b in r.content if b.type == "text"))

v = sys.argv[1]
for n, d in DOCS.items():
    print(n, extraer(d, V1) if v == "1" else extraer(d, V2, SYS_V2))
```

3. Corré `python lab.py 1` y `python lab.py 2`. Anotá: ¿qué CUIT puso V1 para `norte` y `este`? ¿En qué formato salieron las fechas? ¿El total de `este` es negativo?

4. Rompelo: en V2 agregá `"minimum": 0` a `total`. Corré. Tenés que ver un 400 (restricción numérica no soportada). Sacalo y validá el rango en Python, después de parsear: por ejemplo `assert -10_000_000 <= x["total"] <= 10_000_000`.

## Cómo sabés que salió bien

- V1 llena `cuit` en los tres (inventando o poniendo texto como "no provisto").
- V2 devuelve `null` en `cuit` para `norte` y `este`, las tres fechas en `YYYY-MM-DD` y `este` con `-500.0`.
- El paso 4 da 400.

## Si algo falla

- **`moneda` sale "usd"**: la capitalización de enums no está garantizada; compará con `.upper()`.
- **`stop_reason` `max_tokens`**: subí a 8000.
- **V2 inventa igual**: revisá que el ejemplo con `null` esté y que diga "SOLO lo que dice el documento".
