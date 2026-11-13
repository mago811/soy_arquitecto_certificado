---
objective: 25
title: "Lab: prompt vs prefill vs structured outputs, en vivo"
minutes: 45
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/api/errors
    title: "Errors (Prefill not supported)"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
    title: "Increase output consistency"
status: no_verificado
---

## Objetivo

Ver con tus propios ojos por qué, cuando el JSON lo consume código, el único método confiable es **structured outputs** (`output_config.format`). Vas a probar el prompt solo, ver cómo el prefill da 400 en un modelo actual, y romper structured outputs a propósito (constraint no soportado, `max_tokens` corto).

Modelo: `claude-sonnet-5-5` (activo). No uses `claude-sonnet-4-5`: está deprecado y se retira el 30/11/2026.

## Pasos

1. Preparar el entorno:

```bash
mkdir lab25 && cd lab25
python -m venv .venv && source .venv/bin/activate
pip install anthropic pydantic
export ANTHROPIC_API_KEY="sk-ant-..."
```

2. **Método 1: solo prompt.** Creá `a_prompt.py`:

```python
import json, anthropic

client = anthropic.Anthropic()
facturas = [
    "Factura A-0001, total $ 12.500,00, cliente Kiosco Lola",
    "Hola! te paso la factura B-77 de Ferretería Sur por USD 300 (mitad ya pagada)",
    "Nro 0003-00001234 / Importe: 9.999,90 / Razón social: Pérez Hnos. SRL",
]
fallas = 0
for f in facturas:
    r = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=300,
        messages=[{"role": "user", "content":
            f'Devolvé SOLO un JSON con "numero" (string) y "total" (number). Factura: {f}'}],
    )
    texto = r.content[0].text
    try:
        print(json.loads(texto))
    except json.JSONDecodeError:
        fallas += 1
        print("NO PARSEA:", repr(texto[:80]))
print("fallas:", fallas)
```

Correlo 2 o 3 veces. Puede que no falle nunca, o que aparezcan bloques de código markdown o texto antes del `{`. El punto: **nada lo garantiza**.

3. **Método 2: prefill.** Creá `b_prefill.py`:

```python
import anthropic

client = anthropic.Anthropic()
try:
    client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=300,
        messages=[
            {"role": "user", "content": 'JSON con "numero" y "total": Factura A-0001 por $12500'},
            {"role": "assistant", "content": "{"},
        ],
    )
except anthropic.BadRequestError as e:
    print("400 como dice la doc:", e)
```

Tiene que dar **400 `invalid_request_error`**. Claude 4.6 y posteriores no aceptan prefill en el último turno.

4. **Método 3: structured outputs con schema crudo.** Creá `c_structured.py`:

```python
import json, anthropic

client = anthropic.Anthropic()
schema = {
    "type": "object",
    "properties": {
        "numero": {"type": "string"},
        "total": {"type": "number"},
    },
    "required": ["numero", "total"],
    "additionalProperties": False,
}
r = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=300,
    messages=[{"role": "user", "content": "Extraé: Nro 0003-00001234 / Importe: 9.999,90"}],
    output_config={"format": {"type": "json_schema", "schema": schema}},
)
print("stop_reason:", r.stop_reason)
if r.stop_reason == "end_turn":
    texto = next(b.text for b in r.content if b.type == "text")
    print(json.loads(texto))
```

5. **Método 3b: con Pydantic y `parse()`.** Creá `d_parse.py`:

```python
import anthropic
from pydantic import BaseModel, Field

class Factura(BaseModel):
    numero: str
    total: float = Field(ge=0)

client = anthropic.Anthropic()
r = client.messages.parse(
    model="claude-sonnet-5-5",
    max_tokens=300,
    output_format=Factura,
    messages=[{"role": "user", "content": "Extraé: Factura B-77 por USD 300"}],
)
print(r.parsed_output)
```

6. **Rompelo 1: constraint no soportado.** En `c_structured.py`, cambiá `"total": {"type": "number"}` por `"total": {"type": "number", "minimum": 0}` y corré. Esperás un **400**: `minimum` no está soportado en el schema que va a la API. Volvé a correr `d_parse.py` (que tiene `ge=0`, o sea `minimum`): **anda**, porque el SDK saca el constraint del schema, lo pasa a la descripción y valida la respuesta en tu código.

7. **Rompelo 2: `max_tokens` corto.** En `c_structured.py` poné `max_tokens=5`. Mirá `stop_reason`: `max_tokens`. El JSON viene cortado. Por eso se chequea `stop_reason` antes de parsear.

8. **Rompelo 3: el parámetro viejo.** En `c_structured.py` cambiá `output_config={"format": {...}}` por `output_format={"type": "json_schema", "schema": schema}`. Con el SDK de Python 1.x, un dict en `output_format` tira `TypeError`. El nombre correcto es `output_config.format`.

## Cómo sabés que salió bien

- `b_prefill.py` imprime un 400.
- `c_structured.py` y `d_parse.py` devuelven siempre un objeto válido con `stop_reason: end_turn`.
- Con `minimum` crudo → 400; con Pydantic `ge=0` → funciona.
- Con `max_tokens=5` → `stop_reason: max_tokens`.
- Podés explicar en una frase: "prompt orienta, prefill murió, structured outputs garantiza (salvo `refusal` y `max_tokens`)".

## Si algo falla

- `AuthenticationError` → revisá `ANTHROPIC_API_KEY`.
- `parse()` no existe o `output_config` no se reconoce → actualizá: `pip install -U anthropic`.
- El prefill **no** da 400 → seguro estás usando un modelo anterior a 4.6. Verificá el `model`.
- Error "Schema is too complex for compilation" → simplificá el schema (menos opcionales, menos anidado).
