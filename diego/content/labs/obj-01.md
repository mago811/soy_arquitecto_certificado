---
objective: 1
title: "Lab: un bucle agéntico que pide varias tools en un mismo turno"
minutes: 45
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
    title: "Parallel tool use"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
    title: "Handle tool calls"
  - url: https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
    title: "Stop reasons and fallback"
status: verificada
---

## Objetivo

Armar un bucle agéntico mínimo con la Messages API que:

1. siga corriendo mientras `stop_reason` sea `tool_use`,
2. ejecute en paralelo los `tool_use` que vienen en una misma respuesta,
3. devuelva todos los `tool_result` en un solo mensaje `user`.

Después lo vas a romper a propósito para ver qué cambia.

## Pasos

### 0. Preparar (5 min)

```bash
mkdir lab-obj01 && cd lab-obj01
python -m venv .venv && source .venv/bin/activate
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."   # tu key
```

### 1. El bucle correcto (15 min)

Creá `loop.py`. Las tools son las mismas de la página "Parallel tool use", con resultados falsos para no depender de ninguna API externa:

```python
import asyncio
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-opus-5-5"

tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
            "type": "object",
            "properties": {"location": {"type": "string", "description": "The city and state, e.g. San Francisco, CA"}},
            "required": ["location"],
        },
    },
    {
        "name": "get_time",
        "description": "Get the current time in a given timezone",
        "input_schema": {
            "type": "object",
            "properties": {"timezone": {"type": "string", "description": "The timezone, e.g. America/New_York"}},
            "required": ["timezone"],
        },
    },
]

async def run_tool(block):
    await asyncio.sleep(1)  # simula 1 segundo de latencia por tool
    if block.name == "get_weather":
        return "68°F, partly cloudy" if "San Francisco" in str(block.input) else "45°F, clear skies"
    return "2:30 PM PST" if "Los_Angeles" in str(block.input) else "5:30 PM EST"

async def main():
    messages = [{"role": "user", "content": "What's the weather in SF and NYC, and what time is it there?"}]
    calls_per_turn = []
    while True:
        response = client.messages.create(model=MODEL, max_tokens=8000, tools=tools, messages=messages)
        print("stop_reason:", response.stop_reason)
        if response.stop_reason != "tool_use":
            break
        tool_uses = [b for b in response.content if b.type == "tool_use"]
        calls_per_turn.append(len(tool_uses))
        print(f"  {len(tool_uses)} tool_use en esta respuesta:", [(b.name, b.input) for b in tool_uses])

        # Ejecutar en paralelo (son independientes y de solo lectura)
        outputs = await asyncio.gather(*(run_tool(b) for b in tool_uses))

        messages.append({"role": "assistant", "content": response.content})
        messages.append({
            "role": "user",
            "content": [
                {"type": "tool_result", "tool_use_id": b.id, "content": out}
                for b, out in zip(tool_uses, outputs)
            ],
        })
    print("\nRespuesta final:", next(b.text for b in response.content if b.type == "text"))
    if calls_per_turn:
        print("Promedio de tool calls por respuesta con tools:", sum(calls_per_turn) / len(calls_per_turn))

asyncio.run(main())
```

Correlo:

```bash
python loop.py
```

Fijate: ¿cuántos `tool_use` vinieron en la primera respuesta? ¿Cuántas vueltas dio el `while`?

### 2. Medir la latencia (5 min)

Cada tool tarda 1 segundo. Con `asyncio.gather`, 4 tools en paralelo tardan ~1 s, no ~4 s. Envolvé `asyncio.gather(...)` con `time.perf_counter()` antes y después e imprimí la diferencia.

### 3. Romperlo: un mensaje `user` por resultado (10 min)

Reemplazá el `messages.append({"role": "user", ...})` por un `for` que agregue un mensaje `user` por cada `tool_result`. Corré otra vez.

- Lo que dice la doc: "Wrong: a separate user message for each tool result". Ese historial "enseña" a Claude a evitar llamadas en paralelo. En una conversación larga lo vas a notar en el promedio de tool calls por respuesta.
- Volvé a la versión correcta.

### 4. Romperlo: texto antes de los resultados (5 min)

Agregá `{"type": "text", "text": "Acá van los resultados:"}` como **primer** elemento del `content` del mensaje con los `tool_result`. Corré. Tiene que fallar con un 400: los `tool_result` van primero. Moverlo al final sí está permitido (aunque la doc de stop reasons recomienda no agregar texto justo después de los resultados).

### 5. Romperlo: olvidar un resultado (3 min)

Devolvé solo `tool_uses[0]`. Vas a ver `tool_use ids were found without tool_result blocks immediately after`. Arreglo: uno por cada `tool_use`; si no ejecutaste alguno, mandalo igual con `"is_error": True` y una explicación corta.

### 6. Apagar el paralelismo (2 min)

Agregá a `client.messages.create(...)`:

```python
tool_choice={"type": "auto", "disable_parallel_tool_use": True},
```

Corré. Ahora cada respuesta trae como mucho un `tool_use`, y el `while` da más vueltas.

## Cómo sabés que salió bien

- En el paso 1, la primera respuesta trae varios `tool_use` (típicamente 4) y el promedio da más de 1.0.
- Las tools en paralelo tardan ~1 s en total.
- El paso 4 da 400 y el paso 5 da el error de `tool_use ids`.
- En el paso 6 el promedio baja a 1.0 y hay más requests.

## Si algo falla

- **Vino un solo `tool_use`**: el paralelismo es "may", no obligatorio. Agregá el system prompt de la doc: `system="For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially."`
- **`disable_parallel_tool_use` da error de parámetro desconocido**: lo pusiste top-level. Va DENTRO de `tool_choice`.
- **El modelo no existe en tu cuenta**: usá otro de los que lista la página "Parallel tool use" en su lista de modelos soportados.
