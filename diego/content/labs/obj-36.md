---
objective: 36
title: "Lab: medir el misrouting antes y después de reescribir descripciones"
minutes: 35
needs: ["API key de Anthropic", "Python 3.10+ para Windows (con el launcher py)", "PowerShell"]
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
    title: "Define tools"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
    title: "Handle tool calls"
status: verificada
---

## Objetivo

Armar un mini banco de pruebas: 8 pedidos de usuario, dos tools parecidas, y contar cuántas veces Claude elige la tool equivocada. Después reescribir las descripciones siguiendo la doc y volver a medir.

## Pasos

### 0. Preparar (3 min)

```powershell
New-Item -ItemType Directory -Force lab-obj36
Set-Location lab-obj36
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install anthropic
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # tu key; dura solo esta ventana de PowerShell
```

Cada `.py` de este lab lo creás con `code nombre.py` (o `notepad nombre.py`), pegás el contenido y guardás. Corré todo desde esta misma ventana de PowerShell, con el venv activado (el prompt empieza con `(.venv)`).

### 1. Tools ambiguas (10 min)

`routing.py`:

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-opus-5-5"

BAD_TOOLS = [
    {"name": "search", "description": "Search records.",
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "lookup", "description": "Look up data.",
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
]

# (pedido, tool esperada en la versión mala, tool esperada en la versión buena)
CASES = [
    ("¿Cuál es el email de contacto de Acme SA?", "search", "crm_search_customers"),
    ("¿Cuánto debe el cliente CUS-12345?", "lookup", "billing_search_invoices"),
    ("¿Quién es el ejecutivo asignado a Globex?", "search", "crm_search_customers"),
    ("¿Está paga la factura F-2026-0042?", "lookup", "billing_search_invoices"),
    ("Necesito el teléfono de Initech", "search", "crm_search_customers"),
    ("¿Qué facturas vencen esta semana para CUS-777?", "lookup", "billing_search_invoices"),
    ("Buscá a María Pérez, es clienta nuestra", "search", "crm_search_customers"),
    ("¿Cuál fue el último pago de Umbrella?", "lookup", "billing_search_invoices"),
]

def run(tools, idx):
    errors = 0
    for prompt, *expected in CASES:
        r = client.messages.create(model=MODEL, max_tokens=4096, tools=tools,
                                   messages=[{"role": "user", "content": prompt}])
        names = [b.name for b in r.content if b.type == "tool_use"]
        ok = expected[idx] in names
        errors += not ok
        print(("OK  " if ok else "MAL "), prompt, "->", names or r.stop_reason)
    print(f"Errores: {errors}/{len(CASES)}\n")

if __name__ == "__main__":
    run(BAD_TOOLS, 0)
```

```powershell
python routing.py
```

Con "Search records." y "Look up data." no hay forma de saber cuál es cuál: los resultados son ruido. Anotá el número de errores.

### 2. Reescribir siguiendo la doc (15 min)

Agregá `GOOD_TOOLS` aplicando las best practices de "Define tools": nombre con prefijo del servicio, qué hace, cuándo sí y cuándo no, qué es cada parámetro, qué no devuelve. Mínimo 3–4 frases. (En este lab, el "cuándo no" lo expresamos nombrando la otra tool; el paso 3 mide si eso ayuda.)

```python
GOOD_TOOLS = [
    {
        "name": "crm_search_customers",
        "description": (
            "Busca clientes en el CRM por nombre, email o id de cliente y devuelve datos de contacto "
            "(email, teléfono) y el ejecutivo de cuenta asignado. Usala cuando el pedido es sobre "
            "quién es un cliente o cómo contactarlo. No devuelve facturas, deudas ni pagos: para eso "
            "usá billing_search_invoices. El parámetro query acepta texto libre."
        ),
        "input_schema": {"type": "object", "properties": {
            "query": {"type": "string", "description": "Nombre de persona o empresa, email completo o id de cliente (CUS-12345)."}},
            "required": ["query"]},
    },
    {
        "name": "billing_search_invoices",
        "description": (
            "Busca facturas y pagos en el sistema de facturación por id de cliente, nombre de empresa "
            "o número de factura, y devuelve monto, estado (pagada, pendiente, vencida), vencimiento y "
            "último pago. Usala para preguntas de deuda, pagos o vencimientos. No devuelve datos de "
            "contacto ni ejecutivo asignado: para eso usá crm_search_customers."
        ),
        "input_schema": {"type": "object", "properties": {
            "query": {"type": "string", "description": "Id de cliente (CUS-12345), nombre de empresa o número de factura (F-2026-0042)."}},
            "required": ["query"]},
    },
]
```

Cambiá el final del archivo:

```python
if __name__ == "__main__":
    run(BAD_TOOLS, 0)
    run(GOOD_TOOLS, 1)
```

```powershell
python routing.py
```

### 3. Romperlo de otra forma (5 min)

Copiá `GOOD_TOOLS`, sacale a cada descripción la frase "No devuelve… usá …" y volvé a correr. ¿Aparecen errores en los casos frontera ("último pago de Umbrella", "ejecutivo asignado a Globex")? Esa frase es la que marca la relación con la tool vecina.

### 4. Para pensar (2 min)

Si un día tenés 15 tools `billing_*` (`billing_create`, `billing_void`, `billing_refund`…), la doc sugiere consolidar operaciones relacionadas en menos tools con un parámetro `action`. Anotá cómo quedaría.

## Cómo sabés que salió bien

- Con `BAD_TOOLS` los resultados son inconsistentes.
- Con `GOOD_TOOLS` los 8 casos van a la tool correcta (o casi).
- Al sacar la frase de frontera, los casos ambiguos empeoran.

## Si algo falla

- **Claude contesta sin llamar tool** (`end_turn`): con `tool_choice` `auto`, Claude puede responder directo. Agregá una instrucción explícita en el mensaje `user` (por ejemplo, "Usá las herramientas para responder"): la doc de "Define tools" sugiere eso, con `tool_choice` en `auto`, cuando querés que use una tool sin forzarla. Ojo: `tool_choice` `any`/`tool` devuelve 400 en Claude Opus 5.5 y Sonnet 5.5.
- **El modelo no existe en tu cuenta**: usá otro modelo de tu cuenta que soporte tool use.
- **PowerShell no deja ejecutar `Activate.ps1`** ("la ejecución de scripts está deshabilitada en este sistema"): corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, contestá que sí y volvé a correr `.\.venv\Scripts\Activate.ps1`.
- **`py` no se reconoce como comando**: instalá Python para Windows desde python.org (trae el launcher `py`) y abrí una ventana nueva de PowerShell.
- **Abriste otra ventana de PowerShell y nada anda**: `$env:ANTHROPIC_API_KEY` y el venv duran solo esa sesión. En la ventana nueva, entrá a la carpeta del lab, activá el venv y volvé a cargar la key.
