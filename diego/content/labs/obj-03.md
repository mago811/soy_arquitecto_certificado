---
objective: 3
title: "Lab: espiar el prompt de delegación con el Agent SDK"
minutes: 45
needs: ["API key de Anthropic", "Python 3.10+ para Windows (launcher py)", "PowerShell", "pip install claude-agent-sdk"]
sources:
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://code.claude.com/docs/en/agent-sdk/python
    title: "Agent SDK reference - Python"
  - url: https://code.claude.com/docs/en/agent-sdk/quickstart
    title: "Agent SDK quickstart"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
status: verificada
---

## Objetivo

Comprobar que el subagente **solo** recibe el `prompt` de la tool `Agent` (más su system prompt), imprimir ese prompt, y arreglar el coordinador para que la delegación lleve los hallazgos completos con sus metadatos de fuente.

## Pasos

### 0. Preparar (5 min)

En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj03
Set-Location lab-obj03
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install claude-agent-sdk
$env:ANTHROPIC_API_KEY = "sk-ant-..."
New-Item -ItemType Directory -Force hallazgos
code hallazgos\busqueda.md
```

Si `Activate.ps1` da error de "ejecución de scripts deshabilitada", corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y repetí la activación. `$env:ANTHROPIC_API_KEY` dura solo esta ventana: hacé todo el lab en la misma. (Si no usás VS Code, cambiá `code` por `notepad`.)

Pegá en `hallazgos\busqueda.md` y guardá:

```markdown
- "La capacidad instalada creció 12% interanual" — https://ejemplo.org/informe-2025 (publicado 2025-03-10)
```

Después `code hallazgos\pdf.md` y pegá:

```markdown
- "Crecimiento del 9% en el mismo período" — reporte_anual.pdf, pág. 14 (2024)
```

### 1. Coordinador ingenuo (10 min)

Creá `coordinador.py` con `code coordinador.py` y pegá:

```python
import asyncio, sys
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition, ToolUseBlock

SINTETIZADOR = AgentDefinition(
    description="Escribe el informe final a partir de hallazgos ya recolectados.",
    prompt="Sos un redactor. Escribís informes cortos. Cada cifra lleva su fuente.",
    # Solo Glob: puede ver nombres de archivos, pero no leer su contenido.
    # Lo que sepa de los hallazgos tiene que venir en el prompt de delegación.
    tools=["Glob"],
)

SYSTEM = sys.argv[1] if len(sys.argv) > 1 else "Sos un coordinador de research."

async def main():
    async for message in query(
        prompt=(
            "Leé los archivos de hallazgos/ y después usá el subagente sintetizador "
            "para escribir un informe de 5 líneas sobre capacidad instalada."
        ),
        options=ClaudeAgentOptions(
            system_prompt=SYSTEM,
            allowed_tools=["Read", "Glob", "Agent"],
            agents={"sintetizador": SINTETIZADOR},
        ),
    ):
        # Mostrar exactamente qué le pasa el coordinador al subagente
        for block in getattr(message, "content", None) or []:
            if isinstance(block, ToolUseBlock) and block.name in ("Agent", "Task"):
                print("\n===== PROMPT DE DELEGACIÓN =====")
                print(block.input.get("prompt"))
                print("================================\n")
        if hasattr(message, "result"):
            print("RESULTADO:\n", message.result)

asyncio.run(main())
```

Corré `python coordinador.py` (con el venv activo: el prompt empieza con `(.venv)`).

Mirá el bloque **PROMPT DE DELEGACIÓN**. Eso es TODO lo que el sintetizador sabe de los hallazgos: no ve lo que el coordinador leyó con `Read`. ¿Están las dos cifras? ¿Están la URL, el PDF, la página y las fechas?

### 2. Romperlo a propósito (5 min)

Corré con un system prompt que empuje a delegar corto:

```powershell
python coordinador.py "Sos un coordinador. Al delegar, mandá instrucciones de una sola línea, sin pegar datos."
```

Esperable: el sintetizador inventa, responde genérico o dice que no tiene datos. Ningún parámetro del subagente lo arregla: le falta **información**.

### 3. Arreglarlo en el coordinador (15 min)

```powershell
python coordinador.py "Sos un coordinador de research. Cuando delegues al sintetizador, el prompt de delegación tiene que ser autosuficiente: pegá TODOS los hallazgos textuales dentro de <documents>, un <document> por hallazgo con <source> (URL o archivo, página, fecha de publicación) y <document_content>. Poné los documentos arriba y el pedido al final. Indicá el objetivo, el formato de salida y que si dos cifras no coinciden muestre ambas con su fuente."
```

Volvé a mirar el **PROMPT DE DELEGACIÓN**: ahora tienen que aparecer las dos cifras con su fuente. Y el informe tiene que mostrar 12% y 9% atribuidas, sin elegir una.

### 4. La prueba del colega (5 min)

Copiá el prompt de delegación del paso 3 y leelo como si no supieras nada del proyecto. ¿Podrías escribir el informe sin preguntar nada? Si dudás en algo, eso falta en el prompt.

## Cómo sabés que salió bien

- Viste impreso el input `prompt` de la tool `Agent` en las tres corridas.
- En el paso 2 el informe sale pobre o inventado; en el paso 3 trae las dos cifras con URL/PDF, página y fecha.
- Podés explicar por qué subir `max_turns` o cambiar el modelo del sintetizador no habría arreglado el paso 2.

## Si algo falla

- **No se imprime nada en PROMPT DE DELEGACIÓN:** el coordinador no delegó. Hacé el pedido más explícito ("usá el subagente sintetizador") y confirmá que `"Agent"` está en `allowed_tools`. Comparamos `"Agent"` y `"Task"` porque versiones viejas usaban `Task`.
- **Error de autenticación:** revisá que `$env:ANTHROPIC_API_KEY` esté seteada en la misma ventana de PowerShell donde corrés `python` (escribí `$env:ANTHROPIC_API_KEY` y Enter: tiene que imprimir la key).
- **`ModuleNotFoundError: claude_agent_sdk`:** el venv no está activo en esta ventana. Corré `.\.venv\Scripts\Activate.ps1`.
- **El system prompt llega cortado:** en PowerShell pasalo entre comillas dobles en una sola línea, como en los pasos 2 y 3, y no le metas `$` (PowerShell lo tomaría como variable).
- **El sintetizador dice "veo los archivos pero no los puedo leer":** es lo esperado. Tiene solo `Glob` a propósito: no puede leer contenido, así que todo dato tiene que venir en el prompt de delegación.
