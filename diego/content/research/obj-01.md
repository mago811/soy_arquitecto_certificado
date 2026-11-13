# Research — Objetivo 1 (varias tool calls en un mismo turno / ejecución paralela)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools (sección Forcing tool use)
- https://code.claude.com/docs/en/agent-sdk/agent-loop
- https://code.claude.com/docs/en/agent-sdk/subagents
- https://code.claude.com/docs/en/sub-agents (Run parallel research)
- research/exam-guide.md (mapeo: task 1.3 "Spawning parallel subagents by emitting multiple Task tool calls in a single coordinator response rather than across separate turns")

## Parallel tool use (platform)

- "By default, Claude may call multiple tools in a single response."
- "When Claude calls tools, the response has a `stop_reason` of `tool_use` and can contain several `tool_use` blocks in a single assistant turn. How you run those calls is your decision. The API doesn't prescribe an execution order: you can run the calls concurrently (`Promise.all`, `asyncio.gather`), sequentially in the order they appear, or in any combination that suits your tools."
- "Choose the strategy based on what your tools do. Independent, read-only operations are usually safe to run in parallel for lower latency. Tools with side effects, shared state, or ordering requirements might be better run sequentially."
- "Whichever strategy you use, return one `tool_result` for each `tool_use` block, all together in the next user message. Match each result to its call with `tool_use_id`, and put every `tool_result` block before any text content in that message."
- "If you choose not to run a particular call (for example, because you ran the batch sequentially and an earlier call failed), still return a `tool_result` for it with `is_error: true` and a brief explanation."
- "The summary lines at the end restate the two formatting rules that keep parallelism working: every tool result returns in a single user message, and no text content appears before the tool results in that message."
- "Claude 4 and later models make parallel tool calls by default when a request benefits from multiple tools. For all models, you can increase the likelihood of parallel tool calls with targeted prompting"
- System prompt sugerido: "For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially."
- "Parallel tool use is on by default. To turn it off, set `disable_parallel_tool_use: true` inside the `tool_choice` object. It is not a top-level request parameter. The effect depends on the `tool_choice` type."
- "When the `tool_choice` type is `auto` (the default), setting `disable_parallel_tool_use: true` means Claude calls at most one tool in each response. Claude can still answer in plain text without calling any tool."
- "When the `tool_choice` type is `any` or `tool`, setting `disable_parallel_tool_use: true` means Claude calls exactly one tool." (y: Opus 5.5 / Sonnet 5.5 / Fable 5.x / Mythos 5.x no soportan `any`/`tool`).
- Troubleshooting: "The most common issue is formatting tool results incorrectly in the conversation history. This "teaches" Claude to avoid parallel calls." — "**Wrong:** a separate user message for each tool result" / "**Correct:** all tool results together in a single user message"
- Medir: promedio de tool calls por mensaje con tool_use: "Should be > 1.0 if parallel calls are working".
- "If you run in parallel and a call fails because its prerequisite hadn't completed, return `is_error: true` with the natural error message. Claude will reissue the call on the next turn. To reduce dependent calls appearing together, add this to your system prompt: "Only batch tool calls that are independent of each other.""
- Computer use / browser use: "run them sequentially in the order they appear and stop at the first failure".
- Availability: "Usage: To turn it off, set `disable_parallel_tool_use: true` inside `tool_choice`."
- Los ejemplos usan `model="claude-opus-5-5"`.

## Handle tool calls (platform)

- "The response has a `stop_reason` of `tool_use` and one or more `tool_use` content blocks that include: `id` … `name` … `input`".
- "Continue the conversation by sending a new message with the `role` of `user`, and a `content` block containing the `tool_result` type" con `tool_use_id`, `content` (opcional), `is_error` (opcional).
- "Tool result blocks must immediately follow their corresponding tool use blocks in the message history. You cannot include any messages between the assistant's tool use message and the user's tool result message."
- "In the user message containing tool results, the `tool_result` blocks must come FIRST in the content array. Any text must come AFTER all tool results."
- Error típico: "tool_use ids were found without tool_result blocks immediately after".

## Stop reasons (platform)

- Tabla: `end_turn` "Claude completed its response naturally." → "Use the response." · `tool_use` "Claude is calling a tool." → "Run the tool and return the result." · `max_tokens` · `stop_sequence` · `pause_turn` "A server-tool loop reached its iteration limit." · `refusal` · `model_context_window_exceeded`.
- "The continuation is a user message of `tool_result` blocks, one for every `tool_use` block in the response"
- "Leaving out a `tool_result`, or putting one after other content, fails earlier with the standard `tool_use ids were found without tool_result blocks immediately after` error instead."
- Respuestas vacías con `end_turn`: causa común "Adding text blocks immediately after tool results".

## Agent SDK — agent loop (code.claude.com)

- "Evaluate and respond. … It may respond with text, request one or more tool calls, or both."
- "Repeat. Steps 2 and 3 repeat as a cycle. Claude continues calling tools and processing results until it produces a response with no tool calls."
- "Turn 2: Claude calls `Read` on `auth.ts` and `auth.test.ts`." (dos lecturas en un mismo turno)
- "When Claude requests multiple tool calls in a single turn, both SDKs can run them concurrently or sequentially depending on the tool. Read-only tools (like `Read`, `Glob`, `Grep`, and MCP tools marked as read-only) can run concurrently. Tools that modify state (like `Edit`, `Write`, and `Bash`) run sequentially to avoid conflicts."
- "Custom tools default to sequential execution. To enable parallel execution for a custom tool, set `readOnlyHint` in its annotations."

## Subagentes en paralelo

- agent-sdk/subagents: "**Parallelization**: multiple subagents can run concurrently, so independent subtasks finish in the time of the slowest one rather than the sum of all of them."
- sub-agents: "For independent investigations, spawn multiple subagents to work simultaneously" … "This works best when the research paths don't depend on each other."

## No respaldado / descartado

- No encontré en la doc un parámetro top-level `parallel_tool_calls` ni similar: NO existe en la API de Claude (la doc dice explícitamente que `disable_parallel_tool_use` "is not a top-level request parameter").
- No hay un "máximo" documentado de tool calls por turno.
