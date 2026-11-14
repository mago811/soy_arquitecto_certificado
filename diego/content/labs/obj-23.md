---
objective: 23
title: "Lab: el mismo trabajo, síncrono y en batch"
minutes: 50
needs: ["API key de Anthropic", "Python 3.10+ para Windows (con el launcher py)", "PowerShell"]
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/batch-processing
    title: "Batch processing"
status: verificada
---

## Objetivo

Clasificar 10 reseñas de dos formas: con la Messages API (síncrona) y con la Message Batches API. Ver la diferencia de latencia, emparejar resultados por `custom_id`, manejar `errored`/`expired` y reenviar **solo** lo fallido.

## Pasos

### 0. Preparar (5 min)

```powershell
New-Item -ItemType Directory -Force lab-obj23
Set-Location lab-obj23
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install anthropic
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # tu key; dura solo esta ventana de PowerShell
```

Cada `.py` de este lab lo creás con `code nombre.py` (o `notepad nombre.py`), pegás el contenido y guardás. Corré todo desde esta misma ventana de PowerShell, con el venv activado (el prompt empieza con `(.venv)`).

Creá `datos.py`:

```python
RESENAS = {
    "res-001": "Llegó rápido y funciona perfecto.",
    "res-002": "La caja vino rota y nadie responde los mails.",
    "res-003": "Está bien, nada especial.",
    "res-004": "Me cobraron dos veces. Quiero la devolución ya.",
    "res-005": "Excelente atención, me cambiaron el talle sin problema.",
    "res-006": "El producto es bueno pero el envío tardó tres semanas.",
    "res-007": "No lo recomiendo, se rompió a los dos días.",
    "res-008": "Cumple. El precio es razonable.",
    "res-009": "Increíble, lo volvería a comprar.",
    "res-010": "Nunca llegó.",
}
PROMPT = "Clasificá la reseña como positiva, negativa o neutra. Respondé solo con una palabra.\n<resena>{texto}</resena>"
```

### 1. Primero, probá el request con la Messages API (5 min)

La doc lo recomienda: los `params` de un batch se validan recién cuando termina el batch entero. Creá `sincrono.py`:

```python
import time
import anthropic
from datos import RESENAS, PROMPT

client = anthropic.Anthropic()
inicio = time.time()
for cid, texto in RESENAS.items():
    r = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=4000,
        messages=[{"role": "user", "content": PROMPT.format(texto=texto)}],
    )
    print(cid, "".join(b.text for b in r.content if b.type == "text").strip())
print(f"Síncrono: {time.time() - inicio:.1f} s")
```

`max_tokens` va en 4000 porque el thinking también cuenta para ese límite. Corré `python sincrono.py` y anotá el tiempo.

### 2. Crear el batch (siguiendo el ejemplo de la doc) (8 min)

Creá `crear_batch.py`:

```python
import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request
from datos import RESENAS, PROMPT

client = anthropic.Anthropic()

requests = [
    Request(
        custom_id=cid,
        params=MessageCreateParamsNonStreaming(
            model="claude-opus-5-5",
            max_tokens=4000,
            messages=[{"role": "user", "content": PROMPT.format(texto=texto)}],
        ),
    )
    for cid, texto in RESENAS.items()
]

# Request roto a propósito: max_tokens: 0 no está soportado dentro de un batch.
requests.append(
    Request(
        custom_id="res-rota",
        params=MessageCreateParamsNonStreaming(
            model="claude-opus-5-5",
            max_tokens=0,
            messages=[{"role": "user", "content": "Hola"}],
        ),
    )
)

message_batch = client.messages.batches.create(requests=requests)
print(message_batch.id, message_batch.processing_status)
with open("batch_id.txt", "w", encoding="utf-8") as fh:
    fh.write(message_batch.id)
```

Corré `python crear_batch.py`. Tiene que imprimir un id `msgbatch_…` y `in_progress`.

Nota honesta: según la doc, la validación de `params` es asíncrona y el error aparece al final como resultado `errored`. La doc no dice qué `type` de error trae este caso puntual: si `res-rota` cae en `reintentar` en vez de `arreglar`, mirá el error que imprime y anotalo. Si en tu cuenta el `create` rechaza el batch de entrada por el request roto, sacalo y seguí: también es la lección (probá el shape con la Messages API antes).

### 3. Pollear hasta `ended` (10 min, casi todo esperando)

Creá `poll.py` (igual al ejemplo de la doc):

```python
import time
import anthropic

client = anthropic.Anthropic()
MESSAGE_BATCH_ID = open("batch_id.txt", encoding="utf-8").read().strip()

while True:
    message_batch = client.messages.batches.retrieve(MESSAGE_BATCH_ID)
    if message_batch.processing_status == "ended":
        break
    print(f"Batch {MESSAGE_BATCH_ID} is still processing...", message_batch.request_counts)
    time.sleep(60)
print(message_batch.request_counts)
```

Mientras espera: ¿meterías esto en un check de CI que bloquea un merge? La doc dice que puede tardar hasta 24 h.

### 4. Leer resultados por `custom_id` (8 min)

Creá `resultados.py`:

```python
import anthropic
from datos import RESENAS

client = anthropic.Anthropic()
MESSAGE_BATCH_ID = open("batch_id.txt", encoding="utf-8").read().strip()

orden = []
reintentar, arreglar = [], []
for result in client.messages.batches.results(MESSAGE_BATCH_ID):
    orden.append(result.custom_id)
    outcome = result.result
    match outcome.type:
        case "succeeded":
            texto = "".join(b.text for b in outcome.message.content if b.type == "text").strip()
            print(result.custom_id, "→", texto, "|", RESENAS.get(result.custom_id, "")[:40])
        case "errored":
            if outcome.error.error.type == "invalid_request_error":
                arreglar.append(result.custom_id)   # hay que corregir el request antes de reenviar
            else:
                reintentar.append(result.custom_id) # se puede reenviar tal cual
        case "expired":
            reintentar.append(result.custom_id)
print("Orden de llegada:", orden)
print("Arreglar:", arreglar, "· Reintentar:", reintentar)
```

Mirá el **orden de llegada**: la doc avisa que puede no coincidir con el orden de envío. Por eso emparejás con `custom_id`, nunca con la posición.

### 5. Reenviar solo lo fallido (8 min)

Creá `reenviar.py` que arma un batch nuevo **solo** con los `custom_id` de `arreglar` (corregidos: `max_tokens` válido) y `reintentar`. No reenvíes los `succeeded`: ya los pagaste.

```python
import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

client = anthropic.Anthropic()
fallidos = {"res-rota": "Hola"}  # completá con lo que imprimió resultados.py

nuevo = client.messages.batches.create(requests=[
    Request(custom_id=cid, params=MessageCreateParamsNonStreaming(
        model="claude-opus-5-5", max_tokens=4000,
        messages=[{"role": "user", "content": texto}]))
    for cid, texto in fallidos.items()
])
print(nuevo.id)
```

### 6. Cierre: llená la tabla (3 min)

| Caso | ¿Messages o Batches? | ¿Por qué? |
|---|---|---|
| Check de CI que bloquea el merge | | |
| 40.000 siniestros por noche, se leen a la mañana | | |
| Chat de soporte en vivo | | |
| SLA de 30 h con batch de hasta 24 h: ¿cada cuánto mandás? | | |

## Cómo sabés que salió bien

- `sincrono.py` tarda segundos; el batch, minutos (o más).
- `poll.py` termina con `processing_status == "ended"` y `request_counts` muestra cuántos `succeeded` y `errored`.
- `resultados.py` empareja todo por `custom_id`, aunque lleguen en otro orden.
- `res-rota` aparece como `errored` (lo esperable es `arreglar`, por ser un error de validación), y el reenvío lleva solo ese request.
- Tu tabla: CI y chat → Messages; nocturno → Batches; SLA 30 h → batches cada ≤ 6 h (por ejemplo, cada 4 h).

## Si algo falla

- **`custom_id` inválido:** 1–64 caracteres, solo letras, números, `-` y `_`. Nada de puntos ni espacios.
- **Error de validación con `stream: true`:** la Batches API no soporta streaming (tampoco `speed`, `fallbacks` ni `max_tokens: 0`).
- **El batch no termina:** lo normal es menos de 1 hora, pero puede tardar hasta 24 h; si no termina en 24 h, lo pendiente sale `expired` (no se cobra).
- **No encontrás los resultados de un batch viejo:** están disponibles 29 días desde que lo creaste.
- **Querés cambiar un batch ya enviado:** no se puede; cancelalo (`client.messages.batches.cancel(id)`) y mandá otro.
- **PowerShell no deja ejecutar `Activate.ps1`** ("la ejecución de scripts está deshabilitada en este sistema"): corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, contestá que sí y volvé a correr `.\.venv\Scripts\Activate.ps1`.
- **`py` no se reconoce como comando**: instalá Python para Windows desde python.org (trae el launcher `py`) y abrí una ventana nueva de PowerShell.
- **Abriste otra ventana de PowerShell y nada anda**: `$env:ANTHROPIC_API_KEY` y el venv duran solo esa sesión. En la ventana nueva, entrá a la carpeta del lab, activá el venv y volvé a cargar la key.
- **`UnicodeDecodeError` o tildes rotas al leer/escribir el `.json`/`.txt`:** en Windows Python no usa UTF-8 por defecto para archivos. Por eso cada `open(...)` del lab lleva `encoding="utf-8"`; si lo sacaste, volvé a ponerlo.
