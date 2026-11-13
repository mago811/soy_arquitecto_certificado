---
objective: 35
title: "Lab: un `.mcp.json` de equipo con variables, scopes que se pisan y verificación"
minutes: 50
needs: ["Claude Code", "Node (npx)", "git", "una carpeta de prueba", "opcional: Python 3.10+ para el paso del Agent SDK"]
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

```bash
mkdir lab-obj35 && cd lab-obj35 && git init
mkdir -p data && echo "hola" > data/nota.txt
```

Creá `.mcp.json` en la raíz:

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

```bash
claude mcp list
```

Vas a ver `files` como `⏸ Pending approval (run `claude` to approve)`: los servers de `.mcp.json` piden aprobación en sesiones interactivas.

```bash
claude
```

Aprobá el server. Dentro de la sesión:

```text
/mcp
```

Tiene que aparecer `files` con ✔ y la cantidad de tools. Salí y corré `claude mcp list` de nuevo: ahora `✔ Connected`.

### 3. Usar la variable (5 min)

```bash
export LAB_DIR="$(pwd)/data"
claude
```

Pedí: `Usando el server files, listá los archivos disponibles.` Tiene que ver `nota.txt`.

### 4. Romper la variable (5 min)

Cambiá en `.mcp.json` `"${LAB_DIR:-.}"` por `"${LAB_DIR}"` (sin default) y corré:

```bash
unset LAB_DIR
claude mcp list
```

Buscá el warning de variable faltante: la config carga igual, pero con el texto `${LAB_DIR}` sin expandir. Volvé a poner el default.

Pregunta para vos: si hacés `export LAB_DIR=""`, ¿`${LAB_DIR:-.}` da `.`? No: una variable en string vacío cuenta como seteada y expande a vacío. Para usar el default hay que hacer `unset`.

### 5. El mismo nombre en dos scopes (10 min)

Agregá otro `files` en scope local (el default), apuntando a otra carpeta:

```bash
claude mcp add --transport stdio files -- npx -y @modelcontextprotocol/server-filesystem /tmp
claude mcp list
claude mcp get files
```

- Local tiene más precedencia que project: Claude Code usa **una sola** definición, entera, sin mezclar campos.
- Si te muestra el warning de mismo nombre en más de un scope, la doc dice que te quedes con uno y borres el otro.

Limpiá el local:

```bash
claude mcp remove files --scope local
```

### 6. Scope user (5 min)

```bash
claude mcp add --transport http cc-docs --scope user https://code.claude.com/docs/mcp
cd .. && mkdir otro-proyecto && cd otro-proyecto
claude mcp list
```

`cc-docs` aparece también acá: user = todos tus proyectos. `files` no aparece: era del otro proyecto. Limpiá:

```bash
claude mcp remove cc-docs --scope user
cd ../lab-obj35
```

### 7. (Opcional) Verificar desde el Agent SDK (5 min)

```bash
python -m venv .venv && source .venv/bin/activate
pip install claude-agent-sdk
```

`check.py`:

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

```bash
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
- **El server stdio no arranca con `claude mcp add`**: revisá que pusiste `--` antes de `npx`.
- **En el SDK el server no aparece**: si configuraste `settingSources` a mano, tiene que incluir `"project"` para que se cargue `.mcp.json`. Corré el script desde la raíz del repo.
