---
objective: 6
title: "Lab: romper (y arreglar) un subagente que no arranca con el Agent SDK"
minutes: 50
needs: ["API key de Anthropic", "Python 3.10+ (lanzador py)", "PowerShell", "VS Code o Notepad"]
sources:
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://code.claude.com/docs/en/agent-sdk/python
    title: "Agent SDK reference - Python"
  - url: https://code.claude.com/docs/en/agent-sdk/permissions
    title: "Configure permissions"
  - url: https://code.claude.com/docs/en/errors
    title: "Error reference"
  - url: https://code.claude.com/docs/en/agent-sdk/quickstart
    title: "Agent SDK quickstart (Setup en Windows)"
status: verificada
---

## Objetivo

Tener un coordinador con un subagente `auditor`, romper los tres "cables" (coordinador sin `Agent` disponible, `AgentDefinition` inválida, definición que no llega) y reconocer el síntoma de cada uno. De paso, comprobar que `dontAsk` solo NO bloquea la delegación.

## Pasos

1. Entorno, en PowerShell:

```powershell
New-Item -ItemType Directory -Force $HOME\lab-subagentes\sql | Out-Null
Set-Location $HOME\lab-subagentes
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install claude-agent-sdk
$env:ANTHROPIC_API_KEY = "sk-ant-..."
Set-Content -Encoding utf8 -Path sql\limpieza.sql -Value 'DELETE FROM clientes WHERE id = 7;'
Set-Content -Encoding utf8 -Path sql\reporte.sql -Value 'SELECT * FROM pedidos;'
```

Si PowerShell bloquea `Activate.ps1` por la execution policy, corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y repetí la activación. `$env:ANTHROPIC_API_KEY` dura solo esa ventana: corré todo el lab en la misma.

2. Creá `coord.py` con el editor (`code coord.py` o `notepad coord.py`) y pegá la versión SANA:

```python
import asyncio
from claude_agent_sdk import (query, ClaudeAgentOptions, AgentDefinition,
                              ToolUseBlock, ToolResultBlock)

AGENTS = {
    "auditor": AgentDefinition(
        description="Audita archivos SQL y reporta sentencias de escritura. Usar para cualquier revisión de SQL.",
        prompt="Sos un auditor de SQL de solo lectura. Listá cada archivo con DELETE/UPDATE/INSERT.",
        tools=["Read", "Grep", "Glob"],
        maxTurns=8,
    )
}

async def main():
    options = ClaudeAgentOptions(
        permission_mode="dontAsk",
        allowed_tools=["Read", "Grep", "Glob", "Agent"],
        agents=AGENTS,
    )
    async for m in query(prompt="Usá el agente auditor para revisar la carpeta sql/", options=options):
        for b in getattr(m, "content", None) or []:
            if isinstance(b, ToolUseBlock) and b.name in ("Agent", "Task"):
                print(">> SUBAGENTE LANZADO:", b.input.get("subagent_type"))
            if isinstance(b, ToolResultBlock) and b.is_error:
                print(">> ERROR DE TOOL:", b.content)
        if hasattr(m, "result"):
            print("RESULTADO:", m.result)

asyncio.run(main())
```

3. Corré `python coord.py`. Tenés que ver `>> SUBAGENTE LANZADO: auditor` y un resultado que menciona `limpieza.sql`.

4. **Control — ¿`dontAsk` bloquea `Agent`?** Sacá `"Agent"` de `allowed_tools` (dejá `permission_mode="dontAsk"`). Corré. Anotá si el subagente se lanza igual. Volvé a ponerlo.

5. **Rotura 1 — coordinador sin cable.** Agregá `disallowed_tools=["Agent"]` a `ClaudeAgentOptions`. Corré. ¿Aparece siquiera un intento de lanzar? Sacalo.

6. **Rotura 2 — tools inválidas.** En `AgentDefinition`, cambiá `tools` a `["Raed", "Grpe"]`. Corré y buscá el texto `would be spawned with zero tools`. Restaurá.

7. **Rotura 3 — snake_case.** Cambiá `maxTurns=8` por `max_turns=8`. Corré. Restaurá.

8. **Rotura 4 — la definición no llega.** Mové el agente a archivo. Creá la carpeta y abrí el archivo con el editor:

```powershell
New-Item -ItemType Directory -Force .claude\agents | Out-Null
code .claude\agents\auditor.md
```

Pegá esto y guardá (el `---` tiene que ser la primera línea):

```markdown
---
name: auditor
description: Audita archivos SQL y reporta sentencias de escritura.
tools: Read, Grep, Glob
---
Sos un auditor de SQL de solo lectura. Listá cada archivo con DELETE/UPDATE/INSERT.
```

En `coord.py` quitá `agents=AGENTS` y agregá `setting_sources=[]`. Corré. Después cambiá a `setting_sources=["project"]` y corré de nuevo.

9. **Rotura 5 — archivo salteado.** Con `setting_sources=["project"]`, borrá la línea `description:` del archivo. Corré. Restaurala.

## Cómo sabés que salió bien

| Rotura | Síntoma esperado | Fix |
| :- | :- | :- |
| Control: sin `"Agent"` en `allowed_tools` + `dontAsk` | El subagente se lanza igual: `Agent` no necesita aprobación, así que `dontAsk` no lo deniega | Nada que arreglar (los ejemplos oficiales igual lo listan) |
| 1: `disallowed_tools=["Agent"]` | Ni siquiera intenta: la herramienta no existe | Quitar el deny |
| 2: `tools` con typos | Error `would be spawned with zero tools — refusing` con `unrecognized [Raed, Grpe]` | Nombres reales de tools |
| 3: `max_turns=` | `TypeError` en Python antes de llamar a la API | camelCase: `maxTurns` |
| 4: `setting_sources=[]` | No hay agente `auditor`; con `["project"]` vuelve a aparecer | Cargar la fuente `project` o pasar `agents=` |
| 5: archivo sin `description` | El agente no existe para la sesión | Agregar `description` |

## Si algo falla

- Si en el control (paso 4) Claude NO lanza el subagente, mirá si devolvió un error de tool o si simplemente eligió no delegar: pedile explícitamente "Usá el agente auditor". Según la doc de permisos, `dontAsk` deja correr las llamadas a `Agent`.
- Si no ves `>> SUBAGENTE LANZADO` ni en la versión sana, pedí explícitamente "Usá el agente auditor" (la doc recomienda nombrarlo) y revisá que la `description` sea clara.
- `python` no encuentra `claude_agent_sdk`: el venv no está activo en esa ventana. Corré `.\.venv\Scripts\Activate.ps1` (el prompt pasa a mostrar `(.venv)`).
- En la rotura 2 el error sale como resultado del Agent tool (lo imprime la rama `ToolResultBlock`), no como excepción de Python.
