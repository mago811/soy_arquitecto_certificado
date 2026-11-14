---
objective: 35
title: "Lab: un `.mcp.json` de equipo con variables, scopes que se pisan y verificación"
minutes: 50
needs: ["Claude Code en Windows (PowerShell)", "Node para Windows (npx)", "Git for Windows", "una carpeta de prueba", "opcional: Python 3.10+ para Windows (launcher py) para el paso del Agent SDK"]
sources:
  - url: https://code.claude.com/docs/en/mcp
    title: "Connect Claude Code to tools via MCP"
  - url: https://code.claude.com/docs/en/agent-sdk/mcp
    title: "Connect to external tools with MCP (Agent SDK)"
status: verificada
---

## Objetivo

1. Configurar un server en scope **project** con `.mcp.json` y una variable `${VAR:-default}`.
2. Ver la aprobación de servers de proyecto y verificar con `claude mcp list` y `/mcp`.
3. Romper la variable y leer el warning.
4. Ver qué pasa cuando el mismo nombre está en dos scopes.
5. Agregar un server en scope **user** y comprobar que aparece en otro proyecto.
6. (Opcional) Verificar el descubrimiento desde el Agent SDK.

## Pasos

### 1. Repo de prueba con `.mcp.json` (10 min)

En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj35
Set-Location lab-obj35
git init
New-Item -ItemType Directory -Force data
Set-Content -Path data\nota.txt -Value "hola" -Encoding utf8
code .mcp.json
```

(Si no usás VS Code, `notepad .mcp.json`.) Creá el `.mcp.json` con el editor, no con `Set-Content`: en PowerShell 5.1 puede salir con BOM o en UTF-16 y romper el JSON. Pegá esto en la raíz del proyecto y guardá:

```json
{
  "mcpServers": {
    "files": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${LAB_DIR:-.}"]
    }
  }
}
```

`${LAB_DIR:-.}`: si `LAB_DIR` está seteada usa su valor; si no, usa `.`.

### 2. Aprobación y verificación (10 min)

```powershell
claude mcp list
```

Vas a ver `files` como `⏸ Pending approval (run `claude` to approve)`: los servers de `.mcp.json` piden aprobación en sesiones interactivas.

```powershell
claude
```

Aprobá el server. Dentro de la sesión:

```text
/mcp
```

Tiene que aparecer `files` con ✔ y la cantidad de tools. Salí y corré `claude mcp list` de nuevo: ahora `✔ Connected`.

### 3. Usar la variable (5 min)

```powershell
$env:LAB_DIR = "$PWD\data"
claude
```

`$env:LAB_DIR` vive solo en esta ventana de PowerShell: `claude` la hereda porque lo lanzás desde acá. Si abrís otra ventana, la variable no está.

Pedí: `Usando el server files, listá los archivos disponibles.` Tiene que ver `nota.txt`.

### 4. Romper la variable (5 min)

Cambiá en `.mcp.json` `"${LAB_DIR:-.}"` por `"${LAB_DIR}"` (sin default) y corré:

```powershell
Remove-Item Env:LAB_DIR -ErrorAction SilentlyContinue
claude mcp list
```

Buscá el warning de variable faltante: la config carga igual, pero con el texto `${LAB_DIR}` sin expandir. Volvé a poner el default.

Pregunta para vos: si una variable está seteada en string vacío, ¿`${LAB_DIR:-.}` da `.`? No: según la doc, una variable en string vacío cuenta como seteada y expande a vacío. Para usar el default hay que borrar la variable (en PowerShell, `Remove-Item Env:LAB_DIR`), no dejarla vacía.

### 5. El mismo nombre en dos scopes (10 min)

Agregá otro `files` en scope local (el default), apuntando a otra carpeta:

```powershell
claude mcp add --transport stdio files -- npx -y @modelcontextprotocol/server-filesystem $env:TEMP
claude mcp list
claude mcp get files
```

`$env:TEMP` es tu carpeta temporal de Windows (algo como `C:\Users\Diego\AppData\Local\Temp`); PowerShell la reemplaza por la ruta antes de pasársela a `claude`.

- Local tiene más precedencia que project: Claude Code usa **una sola** definición, entera, sin mezclar campos.
- Si te muestra el warning de mismo nombre en más de un scope, la doc dice que te quedes con uno y borres el otro.

Limpiá el local:

```powershell
claude mcp remove files --scope local
```

### 6. Scope user (5 min)

```powershell
claude mcp add --transport http cc-docs --scope user https://code.claude.com/docs/mcp
Set-Location ..
New-Item -ItemType Directory -Force otro-proyecto
Set-Location otro-proyecto
claude mcp list
```

`cc-docs` aparece también acá: user = todos tus proyectos. `files` no aparece: era del otro proyecto. Limpiá:

```powershell
claude mcp remove cc-docs --scope user
Set-Location ..\lab-obj35
```

Los servers de scope user y local se guardan en `$HOME\.claude.json`; los de project, en el `.mcp.json` del repo.

### 7. (Opcional) Verificar desde el Agent SDK (5 min)

Parado en `lab-obj35`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install claude-agent-sdk
code check.py
```

Si PowerShell no te deja correr `Activate.ps1` ("la ejecución de scripts está deshabilitada"), corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y volvé a activar. Con el venv activo, el prompt arranca con `(.venv)`.

Pegá en `check.py`:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, SystemMessage, ResultMessage

async def main():
    options = ClaudeAgentOptions(allowed_tools=["mcp__files__*"])  # .mcp.json se carga con los settingSources por defecto
    async for message in query(prompt="Listá los archivos con el server files", options=options):
        if isinstance(message, SystemMessage) and message.subtype == "init":
            print("MCP servers:", message.data.get("mcp_servers"))
            print("MCP tools:", [t for t in message.data.get("tools", []) if t.startswith("mcp__")])
        if isinstance(message, ResultMessage) and message.subtype == "success":
            print(message.result)

asyncio.run(main())
```

```powershell
python check.py
```

Probá sacar `allowed_tools`: Claude ve las tools pero no puede llamarlas sin permiso.

## Cómo sabés que salió bien

- Viste `⏸ Pending approval` antes de aprobar y `✔ Connected` después.
- `/mcp` mostró el server con su cantidad de tools.
- Viste el warning de variable faltante al sacar el default.
- `claude mcp get files` mostró una sola definición cuando había dos scopes.
- `cc-docs` apareció en otro proyecto y `files` no.
- (Opcional) El mensaje `init` mostró `files` con `status` `connected` y tools `mcp__files__...`. Si lo ves en `pending`, no es una falla: los servers de `.mcp.json` muchas veces siguen conectando cuando sale el `init` (la doc dice que no tomes `pending` como error por sí solo); las fallas son `failed` o `needs-auth`.

## Si algo falla

- **`✘ Failed to connect`**: `claude mcp get files` muestra el detalle en la línea `Issue:`.
- **El server stdio no arranca con `claude mcp add`**: revisá que pusiste `--` antes de `npx`. Probá también `npx --version` en la misma ventana: si PowerShell no lo encuentra, falta Node en el `PATH` (cerrá y abrí la terminal después de instalarlo).
- **El server lista otra carpeta en el paso 3**: abriste `claude` en una ventana donde no seteaste `$env:LAB_DIR`. Revisalo con `$env:LAB_DIR` (tiene que imprimir la ruta a `data`).
- **En el SDK el server no aparece**: si configuraste `settingSources` a mano, tiene que incluir `"project"` para que se cargue `.mcp.json`. Corré el script desde la raíz del repo.
