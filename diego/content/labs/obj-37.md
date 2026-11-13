---
objective: 37
title: "Lab: encadenar tools con dependencias (y ver por qué forzar no alcanza)"
minutes: 55
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
    title: "How tool use works (The agentic loop)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
    title: "Parallel tool use"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
    title: "Handle tool calls"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
    title: "Define tools (Forcing tool use)"
status: no_verificado
---

## Objetivo

Un flujo de reembolso con dos tools: `buscar_cliente(email)` → `customer_id`, y `emitir_reembolso(customer_id, monto)`. Vas a:

1. Forzar mal la tool dependiente y ver el ID inventado.
2. Armar el loop correcto (requests sucesivos con `tool_result`).
3. Forzar cada paso en su request.
4. Jugar con `disable_parallel_tool_use` y romper el formato de `tool_result`.

Modelo: `claude-haiku-5-5` (acepta `tool_choice` `any`/`tool`).

## Pasos

1. Entorno:

```bash
mkdir lab37 && cd lab37
python -m venv .venv && source .venv/bin/activate
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

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
    model="claude-haiku-5-5", max_tokens=500, tools=TOOLS,
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
    r = client.messages.create(model="claude-haiku-5-5", max_tokens=1000,
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

5. **Forzar cada paso en su request.** Copiá `b_loop.py` a `c_pasos.py` y hacé que el `tool_choice` dependa de la vuelta:

```python
PASOS = [{"type": "tool", "name": "buscar_cliente"},
         {"type": "tool", "name": "emitir_reembolso"},
         {"type": "auto"}]
# ...dentro del while, con un contador i:
#     tool_choice=PASOS[min(i, 2)]
```

Ahora el orden está garantizado **y** cada tool recibe el dato correcto, porque cada forzado ocurre después de que llegó el `tool_result` previo.

6. **Paralelo y `disable_parallel_tool_use`.** Cambiá el mensaje en `b_loop.py` a "Reembolsá $500 a ana@x.com y $200 a ana@x.com". Si Claude manda varias tools juntas, fijate que tu loop devuelve **todos** los `tool_result` en **un solo** mensaje `user`. Después agregá en `create(...)`:

```python
    tool_choice={"type": "auto", "disable_parallel_tool_use": True},
```

Ahora sale **a lo sumo una** tool por respuesta. (Ponerlo como parámetro top-level de `create` no es válido: va **dentro** de `tool_choice`.)

7. **Rompelo: formato de `tool_result`.** En `b_loop.py`, reemplazá la línea del `append` de resultados por:

```python
    messages.append({"role": "user", "content": [{"type": "text", "text": "acá van"}] + resultados})
```

Esperás un **400**: los `tool_result` tienen que ir **primero** en el `content`. Volvé a dejarlo bien.

## Cómo sabés que salió bien

- `a_mal.py` muestra un `customer_id` que no salió de ningún lado.
- `b_loop.py` imprime `buscar_cliente` → `emitir_reembolso(cus_8F3K2, 500)` → `end_turn`.
- Con `disable_parallel_tool_use` dentro de `tool_choice`, nunca hay dos `tool_use` en la misma respuesta.
- Texto antes del `tool_result` → 400.

## Si algo falla

- Error "tool_use ids were found without tool_result blocks immediately after" → te faltó devolver un `tool_result` para algún `tool_use`, o metiste un mensaje en el medio.
- `tool_choice` `tool` da 400 → ¿estás en `claude-sonnet-5-5` o `claude-opus-5-5`? Esos no aceptan forzar. Usá `claude-haiku-5-5` para este lab.
- `stop_reason: max_tokens` con un `tool_use` cortado → subí `max_tokens` y reintentá.
