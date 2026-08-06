# Lab día 3 💻 — El chatbot que olvida (~30 min)

Objetivo: sentir en carne propia que la Messages API no recuerda nada — el historial es TU problema, y sus dos mitades importan.

Setup: Windows 11, `python`, `ANTHROPIC_API_KEY` configurada, SDK instalado (`pip install anthropic`).

## Parte 1 — La versión ROTA (8 min)

Creá `chat.py`:

```python
import anthropic
client = anthropic.Anthropic()

while True:
    texto = input("Vos: ")
    r = client.messages.create(
        model="claude-opus-5",
        max_tokens=500,
        messages=[{"role": "user", "content": texto}],
    )
    print("Claude:", r.content[0].text)
```

Corrélo con `python chat.py`. Decile "me llamo Mago" y después "¿cómo me llamo?". No tiene idea: cada request lleva SOLO el último mensaje, y para la API cada request es una conversación nueva desde cero.

## Parte 2 — El FIX: el cliente es dueño del historial (12 min)

Reemplazá todo por:

```python
import anthropic
client = anthropic.Anthropic()
historial = []

while True:
    texto = input("Vos: ")
    historial.append({"role": "user", "content": texto})
    r = client.messages.create(
        model="claude-opus-5",
        max_tokens=500,
        messages=historial,
    )
    historial.append({"role": "assistant", "content": r.content})
    print("Claude:", r.content[0].text)
    print(f"  [input_tokens: {r.usage.input_tokens}]")
```

Repetí la prueba del nombre: ahora se acuerda. Y mirá `input_tokens` crecer turno a turno — no es un leak: es el historial completo viajando en CADA request. Ese costo se maneja de tu lado (truncar/resumir; prompt caching abarata lo repetido, pero el historial se manda igual).

## Parte 3 — Romperlo a propósito (7 min)

Comentá SOLO esta línea:

```python
    # historial.append({"role": "assistant", "content": r.content})
```

Chateá 3-4 turnos: pedile que elija un número del 1 al 10, después preguntale cuál eligió. Se acuerda de lo que dijiste VOS, pero no de lo que respondió él — su mitad del historial nunca entró. Sin los turnos assistant la conversación degenera: el modelo repite, se contradice, y en tool use directamente rompe (el tool_use vive en esos turnos). Las dos mitades importan.

## Cierre (3 min)

Descomentá la línea, verificá que vuelve a andar, y tachá la tarea t2 del día 3 en el dashboard.
