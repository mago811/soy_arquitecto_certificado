# Lab día 8 💻 — Server con errores tipados y auth (~40 min)

Objetivo: sentir en carne propia cómo descriptions y errores cambian el comportamiento del agente.

## Setup (5 min)

Carpeta `inventario-ot` fuera de este repo. Instalá el SDK: `pip install "mcp[cli]"` (versión 2.x; tutoriales viejos usan `from mcp.server.fastmcp import FastMCP` — eso era el SDK 1.x). Creá `server.py`:

```python
import os
from mcp.server import MCPServer

mcp = MCPServer("inventario-ot")
ACTIVOS = {"10.0.0.5": "PLC-Linea-1", "10.0.0.7": "HMI-Sala-Control"}

@mcp.tool()
def buscar_activo_por_ip(ip: str) -> str:
    """Busca activos."""
    return ACTIVOS[ip]

@mcp.tool()
def buscar_activo_por_nombre(nombre: str) -> str:
    """Busca activos."""
    return [i for i, n in ACTIVOS.items() if n == nombre][0]

if __name__ == "__main__":
    mcp.run()
```

## Parte 1 — La versión ROTA (10 min)

Registralo (scope local, el default):

```
claude mcp add inventario-ot --env OT_API_KEY=demo123 -- python C:\ruta\completa\server.py
```

`claude mcp list` para confirmar que conecta; `claude mcp get inventario-ot` para ver comando y env. Abrí `claude` y preguntá: "¿qué activo tiene la IP 10.0.0.5?" y después "¿qué activo es PLC-Linea-1?". Con dos descriptions idénticas, mirá cuál tool elige. Ahora: "¿qué activo tiene la IP 10.9.9.9?" → KeyError crudo. Observá al agente perderse.

## Parte 2 — FIX descriptions (8 min)

Reescribí los docstrings: por_ip → `"Devuelve el nombre del activo OT dada su IP exacta (formato x.x.x.x). Usala cuando tenés la IP."`; por_nombre → `"Devuelve la IP dado el nombre exacto del activo (ej: PLC-Linea-1). Usala cuando tenés el nombre."`. Sesión nueva de `claude`, mismas preguntas: elección correcta, a la primera.

## Parte 3 — FIX errores (9 min)

En por_ip, ante IP inexistente:

```python
    if ip not in ACTIVOS:
        raise ValueError(f"IP {ip} no está en el inventario. Válidas: {', '.join(ACTIVOS)}. Si tenés el nombre, usá buscar_activo_por_nombre.")
```

El SDK convierte la excepción en un tool result con `is_error` y ese mensaje. Sesión nueva, preguntá por 10.9.9.9: el agente se recupera solo, guiado por el error.

## Parte 4 — Auth por env var (5 min)

Arriba de cada tool: `if not os.environ.get("OT_API_KEY"): raise RuntimeError("OT_API_KEY no definida: registrá el server con --env OT_API_KEY=<valor>.")`. Re-agregá el server SIN `--env` (rompela a propósito), probá una tool y mirá el error claro. Restaurá con `--env`.

## Cierre (3 min)

`claude mcp remove inventario-ot`. ¿Podés decir de memoria los dos canales de diseño (description / error)? Tachá t2 del día 8.
