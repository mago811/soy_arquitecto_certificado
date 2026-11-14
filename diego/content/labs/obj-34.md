---
objective: 34
title: "Lab: ver tools, resources y prompts de un mismo server MCP"
minutes: 40
needs: ["Claude Code en Windows", "Node 22.19 o más nuevo para Windows (npx)", "PowerShell", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/mcp
    title: "Connect Claude Code to tools via MCP"
  - url: https://modelcontextprotocol.io/docs/learn/server-concepts
    title: "Understanding MCP servers"
  - url: https://modelcontextprotocol.io/examples
    title: "Example Servers"
  - url: https://modelcontextprotocol.io/docs/tools/inspector/cli
    title: "MCP Inspector — CLI client"
  - url: https://modelcontextprotocol.io/docs/tools/inspector/configuration
    title: "MCP Inspector — Configuration and flags"
status: verificada
---

## Objetivo

Conectar a Claude Code el servidor de referencia **Everything** (la página de ejemplos de MCP lo describe como "Reference / test server with prompts, resources, and tools") y ver con tus ojos:

- cuáles son sus tools (las llama el modelo),
- cuáles son sus resources (los adjuntás vos con `@`),
- cuáles son sus prompts (los invocás vos con `/`).

Después, diseñar en papel qué expondrías como resource y qué como tool en un caso de examen.

## Pasos

### 1. Mirar el server "desde afuera" con el Inspector (10 min)

En una ventana de PowerShell, en una carpeta de prueba (cada línea es un comando aparte: pegalas de a una):

```powershell
New-Item -ItemType Directory -Force lab-obj34
Set-Location lab-obj34
npx.cmd -y @modelcontextprotocol/inspector --cli npx -y @modelcontextprotocol/server-everything -- --method tools/list
npx.cmd -y @modelcontextprotocol/inspector --cli npx -y @modelcontextprotocol/server-everything -- --method resources/list
npx.cmd -y @modelcontextprotocol/inspector --cli npx -y @modelcontextprotocol/server-everything -- --method resources/templates/list
npx.cmd -y @modelcontextprotocol/inspector --cli npx -y @modelcontextprotocol/server-everything -- --method prompts/list
```

Ojo con el `--`: en el modo `--cli`, todo lo que va **antes** de `--` es el comando del server y todo lo que va **después** son opciones del Inspector. Sin el separador, el `-y` del `npx` interno se leería como opción del Inspector.

Por qué `npx.cmd` y no `npx` a secas: en PowerShell, `npx` a secas ejecuta el script `npx.ps1` que instala Node. Ese script puede estar bloqueado por la política de ejecución de Windows y, con versiones viejas de npm en PowerShell 5.1, se puede "comer" el `--`. `npx.cmd` es el mismo `npx`, pero no pasa por ningún `.ps1` y le llega el `--` intacto. El `npx` de adentro (el que arranca el server) lo lanza el Inspector, no PowerShell, así que queda como está.

<!-- revisar en Windows: confirmar en PowerShell 5.1 que npx.cmd pasa el "--" y que el Inspector logra lanzar el npx interno del server (debería imprimir el JSON de tools/list) -->

Anotá: ¿qué campos tiene cada resource? (buscá `uri`, `name`, `mimeType`). ¿Y cada tool? (buscá `name`, `description`, `inputSchema`).

Elegí una URI de la lista de resources y leela:

```powershell
npx.cmd -y @modelcontextprotocol/inspector --cli npx -y @modelcontextprotocol/server-everything -- --method resources/read --uri "<una-uri-de-la-lista>"
```

### 2. Conectarlo a Claude Code (5 min)

```powershell
claude mcp add --transport stdio everything -- npx -y @modelcontextprotocol/server-everything
claude
```

Corré `claude` desde la misma carpeta `lab-obj34`: el server queda guardado con scope `local`, atado a esa carpeta.

Dentro de Claude Code:

```text
/mcp
```

Confirmá que `everything` aparece conectado y mirá cuántas tools tiene.

### 3. Resources con @ (10 min)

En el prompt, escribí `@` y después `everything:`. El autocompletado te muestra los resources del server, mezclados con tus archivos. Elegí uno y preguntá:

```text
Resumí en dos líneas qué contiene @everything:<la-uri-que-elegiste>
```

Fijate en la transcripción: el resource llegó **adjunto** al prompt (la doc: "Resources are automatically fetched and included as attachments when referenced"). No hizo falta que Claude decidiera llamar una tool para conseguirlo.

### 4. Prompts con / (5 min)

Escribí `/` y buscá las entradas que terminan en `(MCP)` del server `everything`. Esos son los prompts: plantillas que **vos** disparás. Ejecutá uno.

### 5. Diseño en papel (10 min)

Caso: un agente responde preguntas cruzando tres sistemas (CRM, facturación, depósito). Hoy cada server solo tiene tools (`list_tables`, `describe_table`, `run_query`, `create_ticket`). En cada corrida el agente hace 5–6 llamadas de exploración antes de la primera query útil.

Para cada cosa, decidí **tool / resource / resource template / prompt** y por qué:

1. El schema de las tablas de cada sistema.
2. Ejecutar una query SQL con filtros que arma el modelo.
3. Crear un ticket en el CRM.
4. La ficha de un cliente por id (`crm://customers/{id}`).
5. "Informe mensual de morosidad" que el analista dispara a mano.

Respuesta esperada: 1 resource · 2 tool · 3 tool · 4 resource template · 5 prompt.

### 6. Limpieza

```powershell
claude mcp remove everything
```

## Cómo sabés que salió bien

- Viste por separado `tools/list`, `resources/list` y `prompts/list` del mismo server.
- En Claude Code, `@everything:` te ofreció resources y el contenido llegó como adjunto.
- Los prompts del server aparecieron como comandos `(MCP)`.
- En el diseño en papel, nada que "hace algo" quedó como resource.

## Si algo falla

- **`npx` se queja de la versión de Node**: el Inspector requiere Node 22.19.0 o más nuevo.
- **`/mcp` muestra el server fallado**: corré `claude mcp get everything` y mirá la línea `Issue:`. Revisá que pusiste `--` antes de `npx`.
- **`@everything:` no muestra nada**: esperá a que el server termine de conectar (mirá `/mcp`) y volvé a tipear `@`.
- **PowerShell dice que no puede cargar `npx.ps1`** ("la ejecución de scripts está deshabilitada en este sistema"): escribiste `npx` en vez de `npx.cmd`. Usá `npx.cmd` como en los comandos del paso 1 (o corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y contestá que sí).
- **El Inspector se queja de que falta `--method` o trata `--method` como argumento del server**: el `--` no llegó. Revisá que usaste `npx.cmd` y que el `--` está separado por espacios.
- **`npx` o `node` no se reconocen como comando**: instalá Node.js para Windows y abrí una ventana nueva de PowerShell (la ventana vieja no ve el `PATH` nuevo). Probá con `node --version` y `npx.cmd --version`.
