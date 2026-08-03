# Lab día 2 💻 — Un server, tres scopes (~40 min)

Objetivo: configurar el mismo MCP server en los 3 scopes y verificar con tus ojos quién lo ve, dónde vive y quién gana.

## Setup (5 min)

Dos carpetas de juguete fuera de este repo: `proj-a` y `proj-b` (con `git init` en cada una). Usamos el server de demo oficial (`@modelcontextprotocol/server-everything`, no necesita credenciales).

## Parte 1 — local, el default (10 min)

En `proj-a`:

```
claude mcp add demo-local -- npx -y @modelcontextprotocol/server-everything
claude mcp list
```

Ahora andá a `proj-b` y corré `claude mcp list`. No está. Sin flag, el scope es **local**: vos + ESE proyecto. Anotalo: es LA trampa de examen del día.

## Parte 2 — user (5 min)

Desde cualquiera de las dos:

```
claude mcp add demo-user --scope user -- npx -y @modelcontextprotocol/server-everything
```

`claude mcp list` en `proj-a` Y en `proj-b`: aparece en los dos. user = vos, en todos tus proyectos.

## Parte 3 — project y la aprobación (10 min)

En `proj-a`:

```
claude mcp add demo-proj --scope project -- npx -y @modelcontextprotocol/server-everything
```

Abrí el `.mcp.json` que apareció en la raíz: esa es la config que viajaría en el repo. Ahora simulá ser un compañero: copiá `.mcp.json` a `proj-b` y abrí `claude` ahí — mirá el prompt de aprobación. No es un bug: es la seguridad ante servers que llegan por un repo. Probá `claude mcp reset-project-choices`.

## Parte 4 — Precedencia (5 min)

En `proj-a`, agregá otro server con EL MISMO nombre que el de project:

```
claude mcp add demo-proj -- npx -y @modelcontextprotocol/server-everything
claude mcp list
```

¿Cuál quedó activo? El local. Precedencia: **local > project > user**. Así un dev "ve otra cosa" que su equipo sin que .mcp.json cambie.

## Parte 5 — Secrets como env vars (5 min)

Editá `.mcp.json` y agregale al server: `"env": { "API_KEY": "${LAB_TOKEN}" }`. Así entran las credenciales a un archivo compartido: como referencia, jamás literales.

## Cierre

Limpiá: `claude mcp remove demo-local` (y demo-user, demo-proj). ¿Podés decir de memoria los 3 scopes con su "quién + dónde"? Tachá t2 del día 2.
