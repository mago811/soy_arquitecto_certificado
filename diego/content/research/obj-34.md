# Research — Objetivo 34 (MCP resources vs. tools)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://modelcontextprotocol.io/docs/learn/server-concepts (redirige a /docs/2026-07-28/learn/server-concepts)
- https://modelcontextprotocol.io/specification/2025-11-25/server/resources
- https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- https://code.claude.com/docs/en/mcp (secciones "Use MCP resources", "Use MCP prompts as commands", "Scale with MCP tool search")
- https://modelcontextprotocol.io/examples (servidor de referencia Everything)
- https://modelcontextprotocol.io/docs/tools/inspector y /docs/tools/inspector/cli
- research/exam-guide.md: task 2.4 "Exposing content catalogs as MCP resources to give agents visibility into available data without requiring exploratory tool calls"

## Server concepts (modelcontextprotocol.io)

- "Servers provide functionality through three building blocks:" Tools / Resources / Prompts.
- Tools: "Functions that your LLM can actively call, and decides when to use them based on user requests. Tools can write to databases, call external APIs, modify files, or trigger other logic." — Who controls it: **Model**.
- Resources: "Passive data sources that provide read-only access to information for context, such as file contents, database schemas, or API documentation." — Who controls it: **Application**.
- Prompts: "Pre-built instruction templates that tell the model to work with specific tools and resources." — Who controls it: **User**.
- "Resources expose data from files, APIs, databases, or any other source that an AI needs to understand context. Applications can access this information directly and decide how to use it - whether that's selecting relevant portions, searching with embeddings, or passing it all to the model."
- "Each resource has a unique URI (e.g., `file:///path/to/document.md`) and declares its MIME type for appropriate content handling."
- "Direct Resources - fixed URIs that point to specific data." / "Resource Templates - dynamic URIs with parameters for flexible queries. Example: `travel://activities/{city}/{category}`"
- "Resource Templates include metadata such as title, description, and expected MIME type, making them discoverable and self-documenting."
- Operaciones: `resources/list`, `resources/templates/list`, `resources/read` (+ suscripciones a cambios).
- "Tools are model-controlled, meaning AI models can discover and invoke them automatically."
- "Resources are application-driven, giving them flexibility in how they retrieve, process, and present available context."
- "Prompts are user-controlled, requiring explicit invocation rather than automatic triggering."
- Tools: `tools/list` "Discover available tools", `tools/call` "Execute a specific tool".

## Spec 2025-11-25 — resources

- "Resources allow servers to share data that provides context to language models, such as files, database schemas, or application-specific information. Each resource is uniquely identified by a URI."
- "Resources in MCP are designed to be **application-driven**, with host applications determining how to incorporate context based on their needs."
- Ej.: "Implement automatic context inclusion, based on heuristics or the AI model's selection".
- "Servers that support resources **MUST** declare the `resources` capability"; opcionales `subscribe` y `listChanged`.
- "To discover available resources, clients send a `resources/list` request." / "To retrieve resource contents, clients send a `resources/read` request".
- "Resource templates allow servers to expose parameterized resources using URI templates."
- Annotations: `audience` ("user"/"assistant"), `priority` (0.0–1.0), `lastModified`.

## Spec 2025-11-25 — tools

- "Tools in MCP are designed to be **model-controlled**, meaning that the language model can discover and invoke tools automatically based on its contextual understanding and the user's prompts."
- "A tool **MAY** return links to Resources, to provide additional context or data."

## Claude Code (code.claude.com/docs/en/mcp)

- "MCP servers can expose resources that you can reference using @ mentions, similar to how you reference files."
- "Type `@` in your prompt to see available resources from all connected MCP servers. Resources appear alongside files in the autocomplete menu."
- "Use the format `@server:protocol://resource/path` to reference a resource" — ej. `@github:issue://123`, `@docs:file://api/authentication`, `@postgres:schema://users`.
- "Resources are automatically fetched and included as attachments when referenced"
- "Claude Code automatically provides tools to list and read MCP resources when servers support them"
- "MCP servers can expose prompts that become available as commands in Claude Code." — "`/servername:promptname (MCP)`" y "`/mcp__servername__promptname`".

## Inspector

- `npx @modelcontextprotocol/inspector --cli <server> --method tools/list`; métodos `resources/list`, `resources/read` (con `--uri`), `resources/templates/list`, `prompts/list`.
- Requiere Node 22.19.0 o más nuevo.

## No respaldado textualmente

- La frase "exponer catálogos como resources reduce las tool calls exploratorias" viene de la guía del examen (task 2.4), no de la doc de MCP ni de Claude Code. La doc sí respalda las piezas: resources = datos de solo lectura para contexto, controlados por la aplicación, que se listan (`resources/list`) y adjuntan (@-mention) sin que el modelo tenga que "descubrirlos" llamando tools.
- No encontré en la doc oficial del sitio la API del SDK de Python para declarar resources (la guía "Build an MCP server" solo muestra `@mcp.tool()`), así que el lab no escribe un server propio: usa el servidor de referencia Everything.
