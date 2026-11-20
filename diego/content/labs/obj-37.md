---
objective: 37
title: "Lab: encadenar tools con dependencias (y ver por qué forzar no alcanza)"
minutes: 55
needs: ["API key de Anthropic", "Python 3.10+ para Windows (con el launcher py)", "PowerShell"]
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
    title: "How tool use works (The agentic loop)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
    title: "Parallel tool use"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
    title: "Handle tool calls"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
    title: "Define tools (Forcing tool use)"
status: verificada
---

## Objetivo

Un flujo de reembolso con dos tools: `buscar_cliente(email)` → `customer_id`, y `emitir_reembolso(customer_id, monto)`. Vas a:

1. Forzar mal la tool dependiente y ver el ID inventado.
2. Armar el loop correcto (requests sucesivos con `tool_result`).
3. Forzar cada paso en su request.
4. Manejar un lote donde la tool dependiente llega junto con su prerrequisito.
5. Proteger el orden en código cuando el modelo no acepta forzar.

(El formato de los `tool_result` en paralelo y `disable_parallel_tool_use` los practicaste en el lab del objetivo 1; el 400 de forzar en un modelo que no lo acepta, en el del objetivo 27. Acá no se repiten.)

Modelo: `claude-haiku-5-5` (acepta `tool_choice` `any`/`tool`).

## Pasos

1. Entorno:

```powershell
New-Item -ItemType Directory -Force lab37
Set-Location lab37
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install anthropic
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # tu key; dura solo esta ventana de PowerShell
```

Cada `.py` de este lab lo creás con `code nombre.py` (o `notepad nombre.py`), pegás el contenido y guardás. Corré todo desde esta misma ventana de PowerShell, con el venv activado (el prompt empieza con `(.venv)`).

2. Creá `base.py` con las tools y un "backend" falso:

```python
import json

CLIENTES = {"ana@x.com": "cus_8F3K2"}
TOOLS = [
    {
        "name": "buscar_cliente",
        "description": "Busca un cliente por email y devuelve su customer_id. Llamala antes de cualquier operación sobre un cliente.",
        "input_schema": {"type": "object", "properties": {"email": {"type": "string"}}, "required": ["email"]},
    },
    {
        "name": "emitir_reembolso",
        "description": "Emite un reembolso. customer_id tiene que venir de buscar_cliente; nunca lo inventes.",
        "input_schema": {
            "type": "object",
            "properties": {"customer_id": {"type": "string"}, "monto": {"type": "number"}},
            "required": ["customer_id", "monto"],
        },
    },
]

def ejecutar(nombre, args):
    if nombre == "buscar_cliente":
        cid = CLIENTES.get(args["email"])
        return json.dumps({"customer_id": cid}) if cid else "ERROR: cliente no encontrado"
    if nombre == "emitir_reembolso":
        if args["customer_id"] not in CLIENTES.values():
            return f"ERROR: customer_id {args['customer_id']} no existe"
        return json.dumps({"ok": True, "reembolso": args["monto"]})
```

3. **El error: forzar la tool dependiente.** Creá `a_mal.py`:

```python
import anthropic
from base import TOOLS, ejecutar

client = anthropic.Anthropic()
r = client.messages.create(
    model="claude-haiku-5-5", max_tokens=2048, tools=TOOLS,
    tool_choice={"type": "tool", "name": "emitir_reembolso"},
    messages=[{"role": "user", "content": "Reembolsá $500 a ana@x.com"}],
)
b = next(b for b in r.content if b.type == "tool_use")
print("input:", b.input)
print("backend:", ejecutar(b.name, b.input))
```

Claude está obligado a llamar `emitir_reembolso` **ya**, sin tener el `customer_id`. Mirá qué puso. El backend lo rechaza (o peor: en un sistema real podría existir).

4. **Lo correcto: el loop agéntico.** Creá `b_loop.py`:

```python
import anthropic
from base import TOOLS, ejecutar

client = anthropic.Anthropic()
messages = [{"role": "user", "content": "Reembolsá $500 a ana@x.com"}]
while True:
    r = client.messages.create(model="claude-haiku-5-5", max_tokens=2048,
                               tools=TOOLS, messages=messages)
    print("stop_reason:", r.stop_reason)
    if r.stop_reason != "tool_use":
        print(next((b.text for b in r.content if b.type == "text"), ""))
        break
    messages.append({"role": "assistant", "content": r.content})
    resultados = []
    for b in r.content:
        if b.type == "tool_use":
            out = ejecutar(b.name, b.input)
            print(f"  {b.name}({b.input}) -> {out}")
            resultados.append({"type": "tool_result", "tool_use_id": b.id, "content": out,
                               "is_error": out.startswith("ERROR")})
    messages.append({"role": "user", "content": resultados})
```

Esperás: primero `buscar_cliente`, después `emitir_reembolso` con `cus_8F3K2`, después `end_turn`. El dato pasó de una tool a la otra **por el `tool_result`**.

5. **Forzar cada paso en su request.** Creá `c_pasos.py`, donde el `tool_choice` depende de la vuelta:

```python
import anthropic
from base import TOOLS, ejecutar

client = anthropic.Anthropic()
PASOS = [{"type": "tool", "name": "buscar_cliente"},
         {"type": "tool", "name": "emitir_reembolso"},
         {"type": "auto"}]
messages = [{"role": "user", "content": "Reembolsá $500 a ana@x.com"}]
for i, choice in enumerate(PASOS):
    r = client.messages.create(model="claude-haiku-5-5", max_tokens=2048,
                               tools=TOOLS, tool_choice=choice, messages=messages)
    print(f"vuelta {i} tool_choice={choice['type']} stop_reason={r.stop_reason}")
    if r.stop_reason != "tool_use":
        print(next((b.text for b in r.content if b.type == "text"), ""))
        break
    messages.append({"role": "assistant", "content": r.content})
    resultados = []
    for b in r.content:
        if b.type == "tool_use":
            out = ejecutar(b.name, b.input)
            print(f"  {b.name}({b.input}) -> {out}")
            resultados.append({"type": "tool_result", "tool_use_id": b.id, "content": out,
                               "is_error": out.startswith("ERROR")})
    messages.append({"role": "user", "content": resultados})
```

```powershell
python c_pasos.py
```

Ahora el orden está garantizado **y** cada tool recibe el dato correcto, porque cada forzado ocurre después de que llegó el `tool_result` previo. Compará con `a_mal.py`: mismo forzado de `emitir_reembolso`, pero en la vuelta correcta.

6. **Lote con dependencia: ejecutar en orden y cortar.** Claude puede mandar `buscar_cliente` y `emitir_reembolso` en la misma respuesta (con un `customer_id` adivinado en la segunda). No hace falta esperar a que pase: simulalo con un lote armado a mano. Creá `d_lote.py`:

```python
from base import ejecutar

# Lote como el que podría venir en un solo turno: la 2da depende de la 1ra
lote = [
    {"id": "toolu_A", "name": "buscar_cliente", "input": {"email": "nadie@x.com"}},
    {"id": "toolu_B", "name": "emitir_reembolso", "input": {"customer_id": "cus_ADIVINADO", "monto": 500}},
]

resultados, fallo = [], False
for b in lote:
    if fallo:
        resultados.append({"type": "tool_result", "tool_use_id": b["id"], "is_error": True,
                           "content": "No se ejecutó: falló una llamada anterior del mismo lote."})
        continue
    out = ejecutar(b["name"], b["input"])
    resultados.append({"type": "tool_result", "tool_use_id": b["id"], "content": out,
                       "is_error": out.startswith("ERROR")})
    fallo = out.startswith("ERROR")

for r in resultados:
    print(r)
```

```powershell
python d_lote.py
```

Fijate: `emitir_reembolso` **no corrió**, pero igual tiene su `tool_result` con `is_error: true`. Esa es la estrategia de la doc para tools con orden: correr el lote en secuencia, frenar en el primer fallo y devolver `is_error: true` para lo que no corriste. Para que estos lotes aparezcan menos, la doc propone agregar al system prompt: "Only batch tool calls that are independent of each other." Agregalo en `b_loop.py` (`system="Only batch tool calls that are independent of each other."` dentro de `create(...)`) y volvé a correrlo.

7. **Sin forzado: proteger el orden en código.** En un modelo que no acepta `any`/`tool` (por ejemplo `claude-sonnet-5-5`), el orden no lo podés fijar con `tool_choice`. Copiá `b_loop.py` a `e_guardia.py`, cambiá el modelo a `claude-sonnet-5-5` y reemplazá el `for` de ejecución por este, que solo acepta un `customer_id` que haya salido de un `buscar_cliente` anterior:

```python
    resultados = []
    for b in r.content:
        if b.type != "tool_use":
            continue
        if b.name == "emitir_reembolso" and b.input.get("customer_id") not in ids_vistos:
            out = "ERROR: customer_id sin buscar_cliente previo. Llamá buscar_cliente primero."
        else:
            out = ejecutar(b.name, b.input)
            if b.name == "buscar_cliente" and not out.startswith("ERROR"):
                ids_vistos.add(json.loads(out)["customer_id"])
        print(f"  {b.name}({b.input}) -> {out}")
        resultados.append({"type": "tool_result", "tool_use_id": b.id, "content": out,
                           "is_error": out.startswith("ERROR")})
```

Agregá `import json` arriba de todo en `e_guardia.py` y la línea `ids_vistos = set()` justo antes del `while True:` (así recuerda los ids entre vueltas). Corrélo con `python e_guardia.py`. Lo normal es que Claude llame primero `buscar_cliente` (por la descripción), y si alguna vez no lo hace, la guardia le devuelve `is_error` y Claude reintenta en orden. Esto es el patrón de la doc para estos modelos: `auto` + prompting ("Prompting still influences which tool auto picks") + validación en tu código.

## Cómo sabés que salió bien

- `a_mal.py` muestra un `customer_id` que no salió de ningún lado.
- `b_loop.py` imprime `buscar_cliente` → `emitir_reembolso(cus_8F3K2, 500)` → `end_turn`.
- `c_pasos.py` imprime vuelta 0 `buscar_cliente`, vuelta 1 `emitir_reembolso` con `cus_8F3K2`, vuelta 2 `end_turn`.
- `d_lote.py` muestra dos `tool_result`: el de `buscar_cliente` con el error y el de `emitir_reembolso` con `is_error: True` sin haberse ejecutado.
- `e_guardia.py` nunca ejecuta `emitir_reembolso` con un `customer_id` que no salió de `buscar_cliente`.

## Si algo falla

- Error "tool_use ids were found without tool_result blocks immediately after" → te faltó devolver un `tool_result` para algún `tool_use`, o metiste un mensaje en el medio.
- `tool_choice` `tool` da 400 → ¿estás en `claude-sonnet-5-5` o `claude-opus-5-5`? Esos no aceptan forzar. Usá `claude-haiku-5-5` para este lab.
- `stop_reason: max_tokens` con un `tool_use` cortado → subí `max_tokens` y reintentá.
- **PowerShell no deja ejecutar `Activate.ps1`** ("la ejecución de scripts está deshabilitada en este sistema"): corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, contestá que sí y volvé a correr `.\.venv\Scripts\Activate.ps1`.
- **`py` no se reconoce como comando**: instalá Python para Windows desde python.org (trae el launcher `py`) y abrí una ventana nueva de PowerShell.
- **Abriste otra ventana de PowerShell y nada anda**: `$env:ANTHROPIC_API_KEY` y el venv duran solo esa sesión. En la ventana nueva, entrá a la carpeta del lab, activá el venv y volvé a cargar la key.
