---
objective: 35
title: "Integrar MCP: scope, variables de entorno y verificar que las tools aparecen"
rule: "Equipo → project (`.mcp.json` commiteado, secretos como `${VAR}`). Solo yo en este repo → local (default). Solo yo en todos lados → user. Después: `/mcp` o `claude mcp list` para ver ✔ y las tools."
sources:
  - url: https://code.claude.com/docs/en/mcp
    title: "Connect Claude Code to tools via MCP"
  - url: https://code.claude.com/docs/en/agent-sdk/mcp
    title: "Connect to external tools with MCP (Agent SDK)"
status: verificada
---

## Qué es

Integrar un server MCP tiene tres decisiones: **dónde vive la config (scope)**, **cómo le pasás la credencial** y **cómo comprobás que funciona**.

### 1. Scope

| Scope | Carga en | ¿Compartido? | Dónde se guarda | Para qué |
|---|---|---|---|---|
| `local` (default) | Solo este proyecto | No | `~/.claude.json`, bajo la ruta del proyecto | Experimentos, servers personales, credenciales que no querés en git |
| `project` | Solo este proyecto | Sí, por git | `.mcp.json` en la raíz | Lo que usa todo el equipo |
| `user` | Todos tus proyectos | No | `~/.claude.json` | Tus herramientas de siempre |

```bash
claude mcp add --transport http shared-server --scope project https://example.com/mcp
```

Ojo con dos trampas: el scope `local` de MCP **no** es `.claude/settings.local.json`; vive en `~/.claude.json`. Y si el mismo nombre está en varios scopes, gana uno solo (local > project > user), **entero**, sin mezclar campos.

### 2. Credenciales con variables de entorno

El `.mcp.json` se commitea, así que **nunca** lleva el token literal. Lleva una referencia:

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${API_KEY}" }
    }
  }
}
```

- `${VAR}` → el valor de `VAR`. `${VAR:-default}` → el valor, o `default` si no está seteada.
- Funciona en `command`, `args`, `env`, `url` y `headers`.
- Variable sin setear y sin default → el server carga igual, con el texto `${VAR}` sin expandir, y `claude mcp list` muestra un warning.
- Variable seteada en `""` cuenta como seteada → `${VAR:-default}` da `""`, no el default.
- Variables de credenciales de Claude Code (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`…) se leen **vacías** en `url` y `headers` de servers remotos. Si un server necesita ese valor, copialo a una variable con nombre propio.

### 3. Verificar el descubrimiento

- `claude mcp list`: estado por server (`✔ Connected`, `! Needs authentication`, `✘ Failed to connect`, `⏸ Pending approval`).
- `/mcp` dentro de Claude Code: tilde por server y **cantidad de tools**.
- `claude mcp add` **no valida** credenciales: un token mal puesto se guarda igual y falla después. Por eso siempre verificás.

## Cuándo se usa

- **"Todo el equipo tiene que tener el server de Jira"** → `--scope project`, `.mcp.json` en git, token en `${JIRA_TOKEN}` que cada uno setea en su máquina.
- **"Estoy probando un server nuevo"** → local (el default).
- **"Quiero mi server de notas en todos mis repos"** → `--scope user`.
- **En el Agent SDK**: servers en `mcpServers` dentro de `query()`, o el `.mcp.json` del proyecto (se carga si `settingSources` incluye `"project"`, que está en los defaults). Las tools MCP necesitan permiso: `allowedTools: ["mcp__jira__*"]`. Para verificar, mirás el mensaje `system` con subtype `init`: `mcp_servers` trae el `status` de cada server y `tools` la lista de tools `mcp__...`.

## El error típico que el examen quiere que cometas

- **Commitear el token** en `.mcp.json` "porque así anda para todos". Fix: `${VAR}`.
- **Usar scope `user` para algo del equipo.** `user` no se comparte: cada compañero tendría que configurarlo a mano.
- **"Lo agregué y no aparece"** sin mirar `/mcp`: puede estar `⏸ Pending approval` (los servers de `.mcp.json` piden aprobación en sesiones interactivas), fallar con 401 o tener 0 tools.
- **En el SDK, ver las tools pero que Claude no las use**: faltan en `allowedTools`. `acceptEdits` no aprueba tools MCP.

## Ejemplo

Equipo con un server interno de tickets. En la raíz del repo, `.mcp.json` (commiteado):

```json
{
  "mcpServers": {
    "tickets": {
      "type": "http",
      "url": "https://tickets.example.com/mcp",
      "headers": { "Authorization": "Bearer ${TICKETS_TOKEN}" }
    }
  }
}
```

Cada dev hace `export TICKETS_TOKEN=...`, abre `claude`, aprueba el server del proyecto y corre `/mcp`: `tickets` con ✔ y "N tools". Si alguien ve ✘ con 401, su variable está vacía o mal.

## Para recordar

- Default = `local`. Equipo = `project` (`.mcp.json`). Todos mis proyectos = `user`. Local y user viven en `~/.claude.json`.
- Precedencia: local > project > user; gana una entrada entera.
- Secretos: `${VAR}` / `${VAR:-default}` en `command`, `args`, `env`, `url`, `headers`.
- Verificar: `claude mcp list`, `claude mcp get <name>`, `/mcp`. En el SDK: `init` → `mcp_servers[].status` y `tools`.
