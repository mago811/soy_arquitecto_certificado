---
objective: 18
title: "Lab: un worker que devuelve datos, prosa y citas, y una síntesis que no las pierde"
minutes: 50
needs: ["API key de Anthropic", "Python 3.10+ para Windows (launcher py)", "PowerShell", "pip install claude-agent-sdk"]
sources:
  - url: https://code.claude.com/docs/en/agent-sdk/structured-outputs
    title: "Get structured output from agents"
  - url: https://code.claude.com/docs/en/agent-sdk/python
    title: "Agent SDK reference - Python"
  - url: https://platform.claude.com/docs/en/build-with-claude/citations
    title: "Citations"
status: verificada
---

## Objetivo

Definir el schema de salida de un "subagente" de análisis de documentos (datos tipados + resumen en prosa + cita por hallazgo), correrlo con `output_format`, manejar bien los errores, y armar con eso un informe donde los números van en tabla y cada afirmación conserva su fuente.

Como `AgentDefinition` no tiene campo de schema, el worker corre como su propio `query()` con `output_format`. Así el SDK valida la salida.

## Pasos

### 0. Preparar (5 min)

En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj18
Set-Location lab-obj18
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install claude-agent-sdk
$env:ANTHROPIC_API_KEY = "sk-ant-..."
New-Item -ItemType Directory -Force docs
code docs\informe_a.txt
```

Si `Activate.ps1` da error de "ejecución de scripts deshabilitada", corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y repetí la activación. `$env:ANTHROPIC_API_KEY` dura solo esta ventana: hacé todo el lab en la misma. (Si no usás VS Code, cambiá `code` por `notepad`.)

Pegá en `docs\informe_a.txt` y guardá:

```text
Fuente: https://ejemplo.org/informe-2025 · Publicado: 2025-03-10
La capacidad instalada creció 12% interanual. Las exportaciones cayeron levemente.
```

Después `code docs\reporte_b.txt` y pegá:

```text
reporte_anual (sin fecha visible)
Página 14: se registró un crecimiento del 9% en la capacidad instalada.
```

### 1. El schema (10 min)

Creá `worker.py` con `code worker.py` y pegá:

```python
import asyncio, json
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

SCHEMA = {
    "type": "object",
    "properties": {
        "resumen": {"type": "string"},
        "hallazgos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "afirmacion": {"type": "string"},
                    "valor": {"type": "number"},
                    "unidad": {"type": "string"},
                    "extracto": {"type": "string"},
                    "documento": {"type": "string"},
                    "source_url": {"type": "string"},
                    "pagina": {"type": "integer"},
                    "publication_date": {"type": "string"},
                    "estado": {"type": "string", "enum": ["consolidado", "en_disputa"]},
                },
                "required": ["afirmacion", "extracto", "documento", "estado"],
            },
        },
    },
    "required": ["resumen", "hallazgos"],
}

PROMPT = (
    "Analizá los archivos de docs/ sobre capacidad instalada. "
    "Por cada afirmación: extracto textual, documento, URL y página si existen, "
    "fecha de publicación solo si figura en el documento (si no figura, omitila). "
    "Si dos documentos dan cifras distintas para lo mismo, marcá ambas como en_disputa."
)

async def main():
    try:
        async for msg in query(
            prompt=PROMPT,
            options=ClaudeAgentOptions(
                allowed_tools=["Read", "Glob"],
                output_format={"type": "json_schema", "schema": SCHEMA},
            ),
        ):
            if isinstance(msg, ResultMessage):
                if msg.subtype == "success" and not msg.is_error and msg.structured_output:
                    json.dump(msg.structured_output, open("salida.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
                    print("OK → salida.json")
                elif msg.subtype == "error_max_structured_output_retries":
                    print("No logró una salida válida para el schema")
                else:
                    print("Terminó con error o sin structured_output")
    except Exception as error:
        print(f"La sesión terminó con error: {error}")

asyncio.run(main())
```

Corré `python worker.py` (con el venv activo) y abrí `salida.json` con `code salida.json`. Chequeá: ¿el hallazgo de `reporte_b` tiene `publication_date`? No debería: no figura en el documento y el campo es opcional.

### 2. Romperlo: fecha obligatoria (10 min)

Agregá `"publication_date"` a la lista `required` de los ítems y volvé a correr. Mirá qué pasa con `reporte_b`: o aparece una fecha que no está en el documento (inventada), o el run termina sin salida válida. Ese es el error que el examen quiere que veas. Volvé a sacarlo de `required`.

### 3. La síntesis que respeta tipos y fuentes (15 min)

Creá `informe.py` con `code informe.py` (código puro, sin modelo, para ver que el schema alcanza):

```python
import json
d = json.load(open("salida.json", encoding="utf-8"))
print("## Resumen\n" + d["resumen"] + "\n")
print("## Cifras\n| Afirmación | Valor | Fuente | Fecha |\n|---|---|---|---|")
for h in d["hallazgos"]:
    if "valor" in h:
        fuente = h.get("source_url") or f'{h["documento"]} p.{h.get("pagina", "?")}'
        print(f'| {h["afirmacion"]} | {h["valor"]} {h.get("unidad", "")} | {fuente} | {h.get("publication_date", "s/f")} |')
print("\n## En disputa")
for h in d["hallazgos"]:
    if h["estado"] == "en_disputa":
        print(f'- "{h["extracto"]}" ({h["documento"]})')
```

```powershell
python informe.py
```

Los números quedan en tabla, el resumen en prosa, y el 12% vs 9% aparece en "En disputa" con su documento. Ningún dato quedó sin fuente.

### 4. Para pensar (10 min): ¿y si quiero citas verificadas por la API?

Con la API de Messages podrías activar `citations` en cada documento para que la cita apunte a un rango real del texto. Pero **no** podés combinarlo con `output_config.format`: la API devuelve 400. La doc propone pedir una línea por campo (`campo: valor`), con citations activas, y parsear las líneas en tu código. Escribí en dos líneas cuándo elegirías cada camino.

## Cómo sabés que salió bien

- `salida.json` valida contra el schema y cada hallazgo tiene `extracto` y `documento`.
- Con `publication_date` opcional, `reporte_b` no trae fecha inventada.
- `informe.py` arma tabla + prosa + disputas sin perder ninguna fuente.
- Podés explicar por qué no alcanza con mirar `subtype == "success"`.

## Si algo falla

- **El schema es rechazado al arrancar:** el SDK valida con JSON Schema draft-07. No declares `$schema` de otra versión.
- **`error_max_structured_output_retries`:** simplificá (menos `required`, menos anidado) y probá de nuevo.
- **`valor` viene como texto:** revisá que en el schema sea `"type": "number"`.
- **`UnicodeEncodeError` o acentos rotos en `salida.json`:** en Windows Python abre los archivos con la codificación regional si no le decís otra. Por eso los `open(...)` del lab llevan `encoding="utf-8"`: no lo saques.
- **`ModuleNotFoundError: claude_agent_sdk`:** el venv no está activo en esta ventana. Corré `.\.venv\Scripts\Activate.ps1` y volvé a probar.
