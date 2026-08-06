# Lab día 4 💻 — Dos tools, un orden obligatorio (~40 min)

Objetivo: ver con tus ojos que forzar tools no garantiza ni orden ni datos, y arreglarlo encadenando requests.

## Setup (5 min)

Carpeta nueva, `pip install anthropic`, `ANTHROPIC_API_KEY` en el entorno. Creá `lab04.py`:

```python
import anthropic, json
client = anthropic.Anthropic()
MODEL = "claude-opus-5"

TOOLS = [
    {"name": "buscar_pedido",
     "description": "Devuelve el pedido_id activo de un cliente.",
     "input_schema": {"type": "object",
        "properties": {"cliente": {"type": "string"}},
        "required": ["cliente"]}},
    {"name": "cancelar_pedido",
     "description": "Cancela un pedido por su pedido_id.",
     "input_schema": {"type": "object",
        "properties": {"pedido_id": {"type": "string"}},
        "required": ["pedido_id"]}},
]

def ejecutar(nombre, args):
    if nombre == "buscar_pedido":
        return json.dumps({"pedido_id": "PED-7431"})
    return json.dumps({"cancelado": args.get("pedido_id")})
```

## Parte 1 — Romperlo con any (10 min)

Agregá esto y corré `python lab04.py` 4 o 5 veces:

```python
r = client.messages.create(model=MODEL, max_tokens=4096,
    tools=TOOLS, tool_choice={"type": "any"},
    messages=[{"role": "user", "content": "Cancelá el pedido del cliente García"}])
print(r.stop_reason)
for b in r.content:
    if b.type == "tool_use":
        print(b.name, b.input)
```

Mirá qué tool sale primera. Cuando aparezca `cancelar_pedido` con un pedido_id que NO es PED-7431, ahí está: any forzó una llamada sin datos y el modelo inventó. La lección no es la frecuencia, es que PUEDE pasar.

## Parte 2 — El fix encadenado (15 min)

Reemplazá la Parte 1 por:

```python
historial = [{"role": "user", "content": "Cancelá el pedido del cliente García"}]

r1 = client.messages.create(model=MODEL, max_tokens=4096, tools=TOOLS,
    tool_choice={"type": "tool", "name": "buscar_pedido"}, messages=historial)
tu = next(b for b in r1.content if b.type == "tool_use")
historial.append({"role": "assistant", "content": r1.content})
historial.append({"role": "user", "content": [
    {"type": "tool_result", "tool_use_id": tu.id,
     "content": ejecutar(tu.name, tu.input)}]})

r2 = client.messages.create(model=MODEL, max_tokens=4096, tools=TOOLS,
    tool_choice={"type": "auto"}, messages=historial)
print(r2.stop_reason)
for b in r2.content:
    if b.type == "tool_use":
        print(b.name, b.input)   # cancelar_pedido con PED-7431, siempre
```

Corré varias veces: con el tool_result real en el historial, `cancelar_pedido` usa el id verdadero. ESO es garantizar orden: dos requests encadenados, no un tool_choice mágico. Si `r2.stop_reason` es `"tool_use"`, el loop sigue igual: ejecutás y devolvés otro tool_result.

## Parte 3 — Romperlo a propósito (10 min)

Volvé a la Parte 1 y probá `tool_choice={"type": "any", "disable_parallel_tool_use": True}`. Ahora hay a lo sumo UNA tool por respuesta… pero a veces esa única tool sigue siendo `cancelar_pedido` con id inventado. Limita cantidad, no orden. Trampa de examen del día.

## Cierre

¿Podés explicar en una frase por qué la Parte 2 garantiza y la 1 y 3 no? Tachá la tarea t2 del día 4 en el dashboard.
