# Lab día 5 💻 — Documento incompleto, cero inventos (~30 min)

Objetivo: ver al modelo fabricar un CUIT y una fecha con tus propios ojos, y arreglarlo con schema, no con prompt.

## Setup (3 min)

En una carpeta nueva: `pip install anthropic` y `$env:ANTHROPIC_API_KEY="tu-key"` (PowerShell). Creá `extractor.py`:

```python
import json
from anthropic import Anthropic

client = Anthropic()

FACTURA = """FACTURA
Proveedor: Ferreteria El Tornillo SRL
Detalle: 20m cable mallado, 3 prensacables
Total: 184500.50
Categoria: insumos de planta"""

# VERSION ROTA: todo required, nada nullable, sin enum
SCHEMA = {
    "type": "object",
    "properties": {
        "proveedor": {"type": "string"},
        "cuit": {"type": "string"},
        "fecha": {"type": "string"},
        "total": {"type": "number"},
        "categoria": {"type": "string"},
    },
    "required": ["proveedor", "cuit", "fecha", "total", "categoria"],
}

resp = client.messages.create(
    model="claude-opus-5",
    max_tokens=1024,
    tools=[{
        "name": "guardar_factura",
        "description": "Guarda los datos extraidos de una factura",
        "input_schema": SCHEMA,
    }],
    tool_choice={"type": "tool", "name": "guardar_factura"},
    messages=[{"role": "user", "content": f"Extrae los datos de esta factura:\n\n{FACTURA}"}],
)

for block in resp.content:
    if block.type == "tool_use":
        print(json.dumps(block.input, indent=2, ensure_ascii=False))
```

## Parte 1 — Verlo fabricar (7 min)

`python extractor.py`. La factura NO trae CUIT ni fecha: mirá el output — CUIT con formato perfecto y fecha plausible, salidos de la nada. Corré 2–3 veces: los inventos hasta cambian entre corridas.

## Parte 2 — El fix (12 min)

Reemplazá SCHEMA:

```python
SCHEMA = {
    "type": "object",
    "properties": {
        "proveedor": {"type": ["string", "null"], "description": "Razon social. Si no aparece en el documento, devolve null."},
        "cuit": {"type": ["string", "null"], "description": "CUIT del proveedor. Si no aparece en el documento, devolve null. NUNCA lo inventes."},
        "fecha": {"type": ["string", "null"], "description": "Fecha de emision AAAA-MM-DD. Si no aparece, devolve null."},
        "total": {"type": ["number", "null"], "description": "Importe total. Si no aparece, devolve null."},
        "categoria": {
            "type": ["string", "null"],
            "enum": ["ferreteria", "electricidad", "servicios", "otros", None],
            "description": "Categoria del gasto. Si ninguna aplica, usa otros.",
        },
    },
    "required": ["proveedor", "cuit", "fecha", "total", "categoria"],
}
```

Corré de nuevo: `cuit` y `fecha` en null, y "insumos de planta" mapeado al enum. Ojo: todos los campos siguen apareciendo — required + nullable = auditable.

## Parte 3 — Romperlo a propósito (5 min)

Borrale el `enum` a categoria y corré: la categoría libre vuelve — quizá "insumos", quizá algo nuevo. Restauralo. Sin enum no hay espacio cerrado de valores.

## Cierre (3 min)

¿Podés explicar por qué la Parte 1 fabricaba con el schema "completo"? Tachá t2 del día 5 en el dashboard.
