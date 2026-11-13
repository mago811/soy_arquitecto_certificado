---
objective: 22
title: "Lab: ruteo a revisión humana con confianza por campo y precisión por segmento"
minutes: 55
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation
    title: "Content moderation"
  - url: https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing
    title: "Ticket routing"
  - url: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
    title: "Demystifying evals for AI agents"
status: verificada
---

## Objetivo

Armar un extractor de facturas que devuelve, **por campo**, un valor (o `null`) y una confianza. Medir contra un set etiquetado a mano **por tipo de documento y por campo**, elegir umbrales con datos y rutear a revisión humana lo dudoso. Comparar con "revisar 1 de cada 4 al azar".

## Pasos

### 0. Preparar (5 min)

```bash
mkdir lab-obj22 && cd lab-obj22
python3 -m venv .venv && source .venv/bin/activate
pip install anthropic
export ANTHROPIC_API_KEY="tu-key"
```

### 1. Set etiquetado de juguete (10 min)

Creá `dataset.py`. Vos sos el "humano experto": la etiqueta `esperado` es la verdad. Hay facturas limpias, una sin vencimiento, una escaneada con ruido y una contradictoria.

```python
DATASET = [
    {"id": "f1", "tipo": "digital", "texto": "Factura A 0001-00001234. Fecha: 2026-10-01. Vence: 2026-10-31. Total: $ 120.500,00",
     "esperado": {"numero": "0001-00001234", "vencimiento": "2026-10-31", "total": "120500.00"}},
    {"id": "f2", "tipo": "digital", "texto": "Factura B 0003-00000077. Fecha: 2026-09-12. Total $ 8.990,50. Pago contado.",
     "esperado": {"numero": "0003-00000077", "vencimiento": None, "total": "8990.50"}},
    {"id": "f3", "tipo": "escaneada", "texto": "FACT. A O0O2-0OOO5512  Vto: 15/1O/2026  TOTAL $ 45.3OO,OO",
     "esperado": {"numero": "0002-00005512", "vencimiento": "2026-10-15", "total": "45300.00"}},
    {"id": "f4", "tipo": "digital", "texto": "Factura A 0001-00001300. Vence: 2026-11-30. Subtotal $ 100.000. Total: $ 121.000. (Pág. 2) Total a pagar: $ 112.100",
     "esperado": {"numero": "0001-00001300", "vencimiento": "2026-11-30", "total": None}},
    {"id": "f5", "tipo": "escaneada", "texto": "Fac 0004-000I9 vence 3/12 tot 7.2O0",
     "esperado": {"numero": "0004-00019", "vencimiento": None, "total": "7200.00"}},
    {"id": "f6", "tipo": "digital", "texto": "Factura C 0005-00000901. Fecha 2026-08-01. Vencimiento 2026-08-15. Total $ 3.400,00",
     "esperado": {"numero": "0005-00000901", "vencimiento": "2026-08-15", "total": "3400.00"}},
]
```

En `f4` el `total` esperado es `None` a propósito: hay dos totales que no coinciden y lo correcto es **no decidir** y mandarlo a un humano.

### 2. Extractor con valor nullable + confianza por campo (12 min)

Creá `extraer.py`. Usa structured outputs (`output_config.format`). El tipo `["string", "null"]` deja que el modelo diga "no está".

```python
import json
import anthropic

client = anthropic.Anthropic()

CAMPO = {
    "type": "object",
    "properties": {
        "valor": {"type": ["string", "null"]},
        "confianza": {"type": "number"},
        "conflicto": {"type": "boolean"},
        "motivo": {"type": "string"},
    },
    "required": ["valor", "confianza", "conflicto", "motivo"],
    "additionalProperties": False,
}
SCHEMA = {
    "type": "object",
    "properties": {"numero": CAMPO, "vencimiento": CAMPO, "total": CAMPO},
    "required": ["numero", "vencimiento", "total"],
    "additionalProperties": False,
}

PROMPT = """Extraé de la factura: numero, vencimiento (AAAA-MM-DD) y total (número con punto decimal, sin separador de miles).
Para cada campo:
- valor: el dato, o null si la factura no lo trae o no se puede leer con seguridad. No inventes.
- confianza: entre 0 y 1, qué tan seguro estás del valor.
- conflicto: true si el documento trae dos valores distintos para ese campo.
- motivo: una frase corta.
<factura>{texto}</factura>"""

def extraer(texto: str) -> dict:
    response = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=4000,
        messages=[{"role": "user", "content": PROMPT.format(texto=texto)}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)
```

Nota: `motivo` pide una frase corta, no el razonamiento paso a paso. La doc avisa que un campo que pide el razonamiento puede provocar un refusal.

### 3. Medir por segmento (12 min)

Creá `medir.py`:

```python
import json
from collections import defaultdict
from dataset import DATASET
from extraer import extraer

resultados = []
for doc in DATASET:
    out = extraer(doc["texto"])
    for campo, esperado in doc["esperado"].items():
        r = out[campo]
        resultados.append({"id": doc["id"], "tipo": doc["tipo"], "campo": campo,
                           "valor": r["valor"], "esperado": esperado,
                           "ok": r["valor"] == esperado, "confianza": r["confianza"], "conflicto": r["conflicto"]})

json.dump(resultados, open("resultados.json", "w"), indent=2, ensure_ascii=False)

def precision(filas):
    return f"{sum(f['ok'] for f in filas)}/{len(filas)}"

print("GENERAL:", precision(resultados))
seg = defaultdict(list)
for f in resultados:
    seg[("tipo", f["tipo"])].append(f)
    seg[("campo", f["campo"])].append(f)
for k, filas in sorted(seg.items()):
    print(k, precision(filas))
print("\nErrores con confianza alta (>= 0.8):")
for f in resultados:
    if not f["ok"] and f["confianza"] >= 0.8:
        print(" ", f)
```

Corré `python medir.py`. Fijate si la precisión **general** se ve bien mientras `escaneada` o algún campo se ve mal. Esa es la trampa del "97% general".

### 4. Elegir umbrales con datos y rutear (10 min)

Creá `rutear.py`:

```python
import json, random

resultados = json.load(open("resultados.json"))

# Umbral por campo: el menor valor de confianza tal que, por encima, no hubo errores en el set etiquetado.
umbral = {}
for campo in {f["campo"] for f in resultados}:
    errores = [f["confianza"] for f in resultados if f["campo"] == campo and not f["ok"]]
    umbral[campo] = (max(errores) + 0.01) if errores else 0.5
print("Umbrales:", umbral)

def a_revision(f):
    return f["valor"] is None or f["conflicto"] or f["confianza"] < umbral[f["campo"]]

cola = sorted([f for f in resultados if a_revision(f)], key=lambda f: f["confianza"])
auto = [f for f in resultados if not a_revision(f)]
print(f"\nCola humana ({len(cola)}), lo más dudoso primero:")
for f in cola:
    print(f"  {f['id']} {f['campo']} conf={f['confianza']} valor={f['valor']}")
print(f"\nAuto-aprobados: {len(auto)} · errores que se escaparon: {sum(not f['ok'] for f in auto)}")

# Vigilancia: igual mandamos a spot-check una parte de lo auto-aprobado.
muestra = random.sample(auto, k=max(1, len(auto) // 5)) if auto else []
print("Spot-check de auto-aprobados:", [(f["id"], f["campo"]) for f in muestra])

# Comparación: revisar 1 de cada 4 al azar.
azar = random.sample(resultados, k=len(resultados) // 4)
print(f"\nAl azar: revisa {len(azar)} campos y atrapa {sum(not f['ok'] for f in azar)} de {sum(not f['ok'] for f in resultados)} errores.")
```

Corré `python rutear.py` dos o tres veces (el azar cambia).

### 5. Romperlo a propósito (6 min)

1. En `extraer.py` cambiá `"valor": {"type": ["string", "null"]}` por `{"type": "string"}` y sacá "o null…" del prompt. Corré `medir.py` y `rutear.py`. ¿Qué pasó con `f2` (sin vencimiento) y `f4` (dos totales)?
2. Volvé a dejarlo nullable.

## Cómo sabés que salió bien

- `medir.py` muestra precisión por `tipo` y por `campo`, no solo general.
- `f2.vencimiento` y `f4.total` terminan en la cola humana (por `null` o por `conflicto`).
- El ruteo atrapa más errores que el muestreo al azar revisando una cantidad parecida de campos.
- Con el schema no-nullable aparecen valores inventados que se ven "seguros".
- Podés explicar por qué el umbral salió de `resultados.json` y no de tu intuición.

## Si algo falla

- **`json.loads` falla o el JSON viene cortado:** mirá `response.stop_reason`. Si es `max_tokens`, subí `max_tokens` (el thinking también lo usa). Si es `refusal`, el output puede no cumplir el schema.
- **Error 400 por el schema:** cada objeto necesita `"additionalProperties": False`, y no uses features no soportadas (por ejemplo `minimum`/`maximum` en `confianza`).
- **Con 6 facturas los números saltan mucho:** es un set de juguete. En serio se usan cientos de documentos etiquetados, que reflejen la mezcla real (incluidos los casos raros).
- **La confianza del modelo no separa aciertos de errores:** ese es un resultado válido del lab. Por eso el umbral se mide contra datos etiquetados y no se confía a ciegas en el número.
