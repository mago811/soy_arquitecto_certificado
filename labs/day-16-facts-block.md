# Lab día 16 💻 — El dato que sobrevive al resumen (~30 min)

Objetivo: ver con tus ojos el progressive summarisation trap, y que el fix no es instruir al modelo sino sacar el dato del material que se comprime.

Setup: Windows 11, `python`, `ANTHROPIC_API_KEY` configurada, SDK instalado (`pip install anthropic`).

## Parte 1 — La versión ROTA (10 min)

Creá `resumen.py`:

```python
import anthropic
client = anthropic.Anthropic()
MODEL = "claude-opus-5"
historial, turnos = [], 0

def texto(r):                                # en Opus 5 el thinking viene primero
    return next(b.text for b in r.content if b.type == "text")

def resumir(msgs):
    r = client.messages.create(model=MODEL, max_tokens=300, messages=msgs +
        [{"role": "user", "content": "Resumí la conversación en 3 renglones."}])
    return texto(r)

while True:
    historial.append({"role": "user", "content": input("Vos: ")})
    r = client.messages.create(model=MODEL, max_tokens=500, messages=historial)
    historial.append({"role": "assistant", "content": r.content})
    print("Claude:", texto(r))
    turnos += 1
    if turnos % 3 == 0:                      # compactación cada 3 turnos
        historial = [{"role": "user", "content": "Resumen previo: " + resumir(historial)}]
        print("  [historial comprimido]")
```

Corrélo. Turno 1: "la regla OUT-4471 quedó abierta al 0.0.0.0/0 el 14/8 a las 03:22". Charlá 5-6 turnos de cualquier cosa y preguntá: "¿qué regla exacta quedó abierta y cuándo?". El ID y la hora se evaporaron: queda "una regla de salida quedó permisiva".

## Parte 2 — El FIX: facts block (12 min)

Agregá una lista `hechos = []` y, después de cada respuesta, guardá a mano los datos duros:

```python
hechos.append("Regla OUT-4471 abierta a 0.0.0.0/0 el 14/8 03:22")
```

Y pasá el bloque por `system`, que NO entra al historial que se resume:

```python
    r = client.messages.create(model=MODEL, max_tokens=500,
        system="DATOS EXACTOS (no parafrasear):\n" + "\n".join(hechos),
        messages=historial)
```

Repetí la prueba. Comprimí 4-5 veces y preguntá: el ID y la hora siguen intactos. No porque el modelo recuerde mejor, sino porque nunca pasaron por la compresión.

## Parte 3 — Romperlo a propósito (5 min)

Sacá el `system=` y meté los mismos hechos como un mensaje más del historial:

```python
    historial.append({"role": "user", "content": "Datos exactos: " + "\n".join(hechos)})
```

Compactá tres veces. Se degradan igual. **El contenido era idéntico: lo único que cambió fue dónde vivía.**

## Cierre (3 min)

Volvé a la versión de la Parte 2 y tachá la tarea t1 del día 16 en el dashboard.

Lo que tenías que ver: un facts block no es "instrucciones más firmes", es un lugar fuera del alcance del resumen. Instruir a preservar cifras es guidance; excluirlas de la compresión es estructura.
