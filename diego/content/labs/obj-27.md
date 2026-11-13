---
objective: 27
title: "Lab: de 'a veces contesta en texto' a 'siempre llama la tool con tipos correctos'"
minutes: 45
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
    title: "Define tools (Forcing tool use)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
    title: "Strict tool use"
  - url: https://platform.claude.com/docs/en/api/errors
    title: "Errors (Forced tool use not supported)"
status: no_verificado
---

## Objetivo

Armar una tool de extracción, ver cómo con `tool_choice: auto` Claude a veces contesta en texto, forzarla con `tool_choice`, endurecer los tipos con `strict: true`, y ver el 400 que da forzar en un modelo que no lo soporta.

Modelos:
- `claude-haiku-5-5` → acepta forzar (`any` / `tool`).
- `claude-sonnet-5-5` → **no** acepta forzar (400). Lo usamos para romper.

## Pasos

1. Entorno:

```bash
mkdir lab27 && cd lab27
python -m venv .venv && source .venv/bin/activate
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

2. Creá `tools.py` (una tool **sin** strict todavía):

```python
TOOL = {
    "name": "registrar_pedido",
    "description": (
        "Registra un pedido de un cliente en el sistema de stock. "
        "Usala cuando el mensaje describe productos y cantidades. "
        "cantidad es un entero de unidades. No devuelve nada al usuario."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "producto": {"type": "string"},
            "cantidad": {"type": "integer"},
        },
        "required": ["producto", "cantidad"],
    },
}
MENSAJES = [
    "Quiero dos cajas de tornillos",
    "Hola, ¿ustedes hacen envíos a Córdoba? Ah, y anotame 3 martillos",
    "¿Qué me recomendás para colgar un cuadro pesado?",
]
```

3. **auto (el default).** Creá `a_auto.py`:

```python
import anthropic
from tools import TOOL, MENSAJES

client = anthropic.Anthropic()
for m in MENSAJES:
    r = client.messages.create(
        model="claude-haiku-5-5", max_tokens=500, tools=[TOOL],
        messages=[{"role": "user", "content": m}],
    )
    tipos = [b.type for b in r.content]
    print(r.stop_reason, tipos)
    for b in r.content:
        if b.type == "tool_use":
            print("  input:", b.input, {k: type(v).__name__ for k, v in b.input.items()})
```

Mirá el tercer mensaje: lo más probable es que conteste en **texto** (`stop_reason: end_turn`). Si tu pipeline esperaba siempre un `tool_use`, acá se rompe.

4. **Forzar la tool.** Copiá a `b_forzado.py` y agregá en `create(...)`:

```python
        tool_choice={"type": "tool", "name": "registrar_pedido"},
```

Ahora los 3 dan `stop_reason: tool_use`. Fijate que **no hay bloque de texto** antes del `tool_use`: con `any`/`tool` la API prefillea el turno del assistant.

5. **Pedirle que explique (y ver que no puede).** En `b_forzado.py` cambiá un mensaje a "Explicame qué vas a hacer y después registrá 2 cajas de tornillos". Sigue sin texto. Si querés explicación + tool, se usa `auto` + instrucción en el mensaje.

6. **Tipos: sin strict vs con strict.** Agregá a `MENSAJES`: `"Mandame un par de docenas de clavos"`. Mirá el tipo de `cantidad` en la salida. Después, en `tools.py` agregá a `TOOL`:

```python
    "strict": True,
```

y dentro de `input_schema`: `"additionalProperties": False`. Con strict, `cantidad` siempre es `int` y siempre está.

7. **Las dos garantías juntas.** En `b_forzado.py` cambiá a `tool_choice={"type": "any"}` (con `strict: True` en la tool). Esa es la combinación que la doc recomienda para "guarantee both that one of your tools is called and that the tool inputs strictly follow your schema".

8. **Rompelo: forzar en un modelo que no lo soporta.** Creá `c_400.py`:

```python
import anthropic
from tools import TOOL

client = anthropic.Anthropic()
try:
    client.messages.create(
        model="claude-sonnet-5-5", max_tokens=500, tools=[TOOL],
        tool_choice={"type": "any"},
        messages=[{"role": "user", "content": "Quiero dos cajas de tornillos"}],
    )
except anthropic.BadRequestError as e:
    print("400:", e)
```

Fix según la doc: `tool_choice` `auto` + `strict: true`, una instrucción clara ("Usá siempre registrar_pedido"), y **tu código valida** que haya un `tool_use` (si no, reintenta o deriva). O, si lo que querés es la respuesta en JSON y no una llamada, structured outputs (`output_config.format`).

## Cómo sabés que salió bien

- Con `auto` viste al menos una respuesta en texto.
- Con `tool` o `any`, 100% `stop_reason: tool_use` y cero texto previo.
- Con `strict: true`, `cantidad` siempre es `int`.
- `claude-sonnet-5-5` + `any` → 400 `invalid_request_error`.
- Tu código lee `b.input` del bloque `tool_use`, nunca `r.content[0].text`.

## Si algo falla

- `tool_choice` con `claude-haiku-5-5` da 400 → revisá que no tengas `thinking={"type": "enabled", ...}` (thinking manual no acepta `any`/`tool`).
- 400 por `strict` → revisá que el schema use solo features soportadas (sin `minimum`, `maxLength`, etc.) y `additionalProperties: false`.
- Con `auto` nunca contesta en texto → probá mensajes todavía más conversacionales; el comportamiento es probabilístico, justamente ese es el punto.
