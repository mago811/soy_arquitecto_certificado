# Research — Objetivo 37 (tool_choice para garantizar invocación + secuenciar workflows multi-tool)

Fecha de lectura: 2026-11-13. Páginas leídas completas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools (sección "Forcing tool use")
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://platform.claude.com/docs/en/build-with-claude/thinking
- https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- https://platform.claude.com/docs/en/api/errors
- https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons

## Valores de tool_choice
- auto / any / tool / none (ver research/obj-27.md, citas textuales de define-tools).
- "When using prompt caching, changes to the tool_choice parameter will invalidate cached message blocks. Tool definitions and system prompts remain cached, but message content must be reprocessed." (define-tools, Note)

## disable_parallel_tool_use
- "Parallel tool use is on by default. To turn it off, set disable_parallel_tool_use: true inside the tool_choice object. It is not a top-level request parameter." (parallel-tool-use)
- "When the tool_choice type is auto (the default), setting disable_parallel_tool_use: true means Claude calls at most one tool in each response. Claude can still answer in plain text without calling any tool." (parallel-tool-use)
- "When the tool_choice type is any or tool, setting disable_parallel_tool_use: true means Claude calls exactly one tool." (parallel-tool-use)
- Ejemplo: `tool_choice={"type": "auto", "disable_parallel_tool_use": True}` (parallel-tool-use, Python)

## Dependencias entre tools
- "The API doesn't prescribe an execution order: you can run the calls concurrently (Promise.all, asyncio.gather), sequentially in the order they appear, or in any combination that suits your tools." (parallel-tool-use)
- "Tools with side effects, shared state, or ordering requirements might be better run sequentially." (parallel-tool-use)
- "If you choose not to run a particular call (for example, because you ran the batch sequentially and an earlier call failed), still return a tool_result for it with is_error: true and a brief explanation." (parallel-tool-use)
- "If you run in parallel and a call fails because its prerequisite hadn't completed, return is_error: true with the natural error message. Claude will reissue the call on the next turn. To reduce dependent calls appearing together, add this to your system prompt: "Only batch tool calls that are independent of each other."" (parallel-tool-use, Troubleshooting #4)
- Formato: "Wrong: a separate user message for each tool result" / "Correct: all tool results together in a single user message" (parallel-tool-use)

## El loop agéntico (secuenciar = requests sucesivos con tool_result)
- "Client-executed tools (both user-defined and Anthropic-schema) require your application to drive a loop. The model can't run your code, so every tool call is a round trip: the model asks, you execute, you report back, the model continues." (how-tool-use-works)
- Pasos 1–5; "Send a new request containing the original messages, the assistant's response, and a user message with the tool_result blocks." / "Repeat from step 2 while stop_reason is "tool_use"." (how-tool-use-works)
- "The loop exits on any other stop reason ("end_turn", "max_tokens", "stop_sequence", or "refusal")" (how-tool-use-works)

## Formato de tool_result
- "Tool result blocks must immediately follow their corresponding tool use blocks in the message history. You cannot include any messages between the assistant's tool use message and the user's tool result message." (handle-tool-calls)
- "In the user message containing tool results, the tool_result blocks must come FIRST in the content array. Any text must come AFTER all tool results." (handle-tool-calls)
- "If you receive an error such as "tool_use ids were found without tool_result blocks immediately after", check that your tool results are formatted correctly." (handle-tool-calls)

## Forzar una tool no resuelve dependencias (por qué)
- "tool forces Claude to always use a particular tool." (define-tools) — si se fuerza la tool dependiente antes de tener el dato previo, Claude tiene que llenar el input igual.
- "Claude (particularly Claude Sonnet) might guess values you didn't supply" (overview, "When required parameters are missing")
- Inferencia (no textual): la doc no tiene una frase "forzar no encadena"; se deriva de que cada request devuelve una respuesta, y el dato de la tool previa solo llega vía tool_result en el request siguiente.

## Thinking + tool_choice
- "tool use with manual extended thinking (thinking: {type: "enabled"}) only supports tool_choice: {"type": "auto"} (the default) or tool_choice: {"type": "none"}. Using tool_choice: {"type": "any"} or tool_choice: {"type": "tool", "name": "..."} results in an error because these options force tool use, which is incompatible with manual extended thinking." (thinking)
- "To let the model think before it calls a tool, use tool_choice: {"type": "auto"} and say in the prompt when to use the tool." (thinking)
- Modelos que rechazan forced tool use siempre: Claude Opus 5.5, Claude Sonnet 5.5, Claude Fable 5.2, Claude Mythos 5.2, Claude Fable 5.1, Claude Mythos 5.1 (thinking, api/errors).
- "Prompting still influences which tool auto picks." (define-tools, tabla)

## Truncado
- "If Claude's response is cut off because it hit the max_tokens limit, and the truncated response contains an incomplete tool use block, you'll need to retry the request with a higher max_tokens value to get the full tool use." (handling-stop-reasons)

## Lo que NO encontré
- No hay un parámetro para "encadenar" tools o declarar dependencias entre ellas en la API. Si la doc no lo dice, no existe.
