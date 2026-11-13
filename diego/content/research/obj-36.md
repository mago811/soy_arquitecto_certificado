# Research — Objetivo 36 (descripciones de tools que no se confunden)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools (Best practices for tool definitions; Providing tool use examples)
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls (Invalid tool name → descripciones más detalladas)
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview (When Claude uses tools)
- https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- https://code.claude.com/docs/en/mcp (Tool search for MCP server authors)
- research/exam-guide.md: task 2.1 "Tool descriptions as the primary mechanism LLMs use for tool selection"

## define-tools — best practices

- `description`: "A detailed plain text description of what the tool does, when it should be used, and how it behaves."
- "**Provide extremely detailed descriptions.** This is by far the most important factor in tool performance. Your descriptions should explain every detail about the tool, including: What the tool does / When it should be used (and when it shouldn't) / What each parameter means and how it affects the tool's behavior / Any important caveats or limitations, such as what information the tool does not return if the tool name is unclear."
- "Aim for at least 3–4 sentences for each tool description, more if the tool is complex."
- "**Prioritize descriptions, but consider using `input_examples` for complex tools.** … for tools with complex inputs, nested objects, or format-sensitive parameters, you can use the `input_examples` field to provide schema-validated examples."
- "**Consolidate related operations into fewer tools.** Rather than creating a separate tool for every action (`create_pr`, `review_pr`, `merge_pr`), group them into a single tool with an `action` parameter. Fewer, more capable tools reduce selection ambiguity"
- "**Use meaningful namespacing in tool names.** When your tools span multiple services or resources, prefix names with the service (for example, `github_list_prs`, `slack_send_message`). This makes tool selection unambiguous as your library grows"
- "**Design tool responses to return only high-signal information.**"
- Ejemplo bueno `get_stock_price`: "…The ticker symbol must be a valid symbol for a publicly traded company on a major US stock exchange like NYSE or NASDAQ. The tool will return the latest trade price in USD. It should be used when the user asks about the current or most recent price of a specific stock. It will not provide any other information about the stock or company."
- Ejemplo malo: "Gets the stock price for a ticker."
- "The good description clearly explains what the tool does, when to use it, what data it returns, and what the `ticker` parameter means. The poor description is too brief and leaves Claude with many open questions about the tool's behavior and usage."
- Nombre: "Must match the regex `^[a-zA-Z0-9_-]{1,128}$`."

## handle-tool-calls

- "If Claude's attempted use of a tool is invalid (for example, missing required parameters), it usually means that there wasn't enough information for Claude to use the tool correctly. The best approach during development is to try the request again with more-detailed `description` values in your tool definitions."

## overview

- "Claude determines when to call a tool based on the user's request and the tool's description."
- "It calls a tool when the request maps to that tool's described capability and the answer isn't already in context."

## MCP spec tools (2025-11-25)

- Tool: `name` "Unique identifier for the tool", `title`, `description` "Human-readable description of functionality", `inputSchema` "JSON Schema defining expected parameters".
- "Tool names **SHOULD** be unique within a server."

## Claude Code (mcp)

- "Claude Code cuts a tool description or server instructions that run past these default limits, and Claude sees only the text before the cut": 4,096 caracteres (instrucciones de server y tools cargadas upfront), 16,384 (tools cargadas por tool search).
- "Keep descriptions and instructions concise, and put critical details near the start. When tool search matches Claude's query against a tool's description, it reads only the part within the shorter limit, so put the words Claude would search for near the start too."
- Server instructions: "What category of tasks your tools handle / When Claude should search for your tools / Key capabilities your server provides".

## No respaldado

- Ninguna página dice textualmente "mencioná las tools parecidas en la descripción". Lo más cercano: "When it should be used (and when it shouldn't)" + namespacing + consolidación. Las preguntas que tocan "relación con tools similares" se apoyan en esas citas.
