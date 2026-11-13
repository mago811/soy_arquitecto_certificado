---
objective: 28
title: "Lab (repaso): provocar un JSON truncado y arreglarlo partiendo"
minutes: 30
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
    title: "Stop reasons and fallback"
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/build-with-claude/thinking
    title: "Thinking"
status: no_verificado
---

## Objetivo

Ver un `stop_reason: "max_tokens"` con JSON cortado, y arreglarlo de dos formas: subiendo `max_tokens` (cuando alcanza) y partiendo en llamadas chicas con merge en código (cuando el output crece con el input).

Modelo: `claude-opus-5-5`. El thinking cuenta para `max_tokens`.

## Pasos

1. Entorno:

```bash
mkdir lab28 && cd lab28 && python -m venv .venv && source .venv/bin/activate
pip install anthropic && export ANTHROPIC_API_KEY="sk-ant-..."
```

2. `lab.py`:

```python
import json, anthropic
client = anthropic.Anthropic()
SCHEMA = {"type": "object", "properties": {"hallazgos": {"type": "array", "items": {
    "type": "object", "properties": {"archivo": {"type": "string"}, "descripcion": {"type": "string"}},
    "required": ["archivo", "descripcion"], "additionalProperties": False}}},
    "required": ["hallazgos"], "additionalProperties": False}
# 30 "archivos" con el mismo bug plantado
ARCHIVOS = {f"mod{i}.py": f"def f{i}(x):\n    return eval(x)  # input del usuario\n" for i in range(30)}

def review(archivos, max_tokens):
    codigo = "\n".join(f"### {n}\n{c}" for n, c in archivos.items())
    r = client.messages.create(model="claude-opus-5-5", max_tokens=max_tokens,
        messages=[{"role": "user", "content": "Listá TODOS los problemas de seguridad, uno por archivo, con una descripción detallada.\n" + codigo}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}})
    texto = next((b.text for b in r.content if b.type == "text"), "")
    return r.stop_reason, texto

if __name__ == "__main__":
    stop, texto = review(ARCHIVOS, 4000)
    print("stop_reason:", stop)
    try: print("hallazgos:", len(json.loads(texto)["hallazgos"]))
    except Exception as e: print("NO PARSEA:", type(e).__name__)
```

Corré `python lab.py`. Con 30 archivos y 4000 tokens (thinking incluido) debería volver `max_tokens` y el JSON no parsea. Si no se corta, subí a 60 archivos.

3. Arreglo A (subir): cambiá a `review(ARCHIVOS, 32000)`. ¿Entra? Ahora imaginá 600 archivos: ¿hasta dónde subís? El techo de Opus 5.5 en la Messages API es 128K.

4. Arreglo B (partir). `partido.py`:

```python
import json
from lab import review, ARCHIVOS
items = list(ARCHIVOS.items())
hallazgos = []
for i in range(0, len(items), 5):                      # lotes de 5 archivos
    stop, texto = review(dict(items[i:i+5]), 8000)
    if stop == "max_tokens":
        print("lote", i, "truncado: partir más fino"); continue
    hallazgos += json.loads(texto)["hallazgos"]
unicos = {h["archivo"]: h for h in hallazgos}            # dedupe por archivo
print("hallazgos:", len(unicos), "de", len(ARCHIVOS))
```

## Cómo sabés que salió bien

- Paso 2: ves `stop_reason: max_tokens` y "NO PARSEA".
- Paso 4: todos los lotes terminan sin `max_tokens` y tenés 30 hallazgos únicos, sin importar cuántos archivos agregues (solo hay más lotes).

## Si algo falla

- **No se trunca en el paso 2**: bajá `max_tokens` o agregá archivos. El objetivo es ver el corte.
- **Error 400 de schema**: revisá `"additionalProperties": False` en cada objeto.
- **Un lote de 5 se trunca**: bajá a lotes de 2. Partir más fino es el fix, no estirar.
