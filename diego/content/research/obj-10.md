# Research — Objetivo 10 (patrones de orquestación multi-agente)

Fecha de lectura: 2026-11-13.

## URLs consultadas

- https://www.anthropic.com/engineering/multi-agent-research-system (redirige a /research/…)
- https://www.anthropic.com/engineering/building-effective-agents (existe; redirige a /research/building-effective-agents)
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/agent-sdk/subagents
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://code.claude.com/docs/en/best-practices
- Guía del examen (PDF linkeado desde https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification), Task Statement 1.2

## Guía del examen (TS 1.2)

- "Hub-and-spoke architecture where a coordinator agent manages all inter-subagent communication, error handling, and information routing"
- "How subagents operate with isolated context—they do not inherit the coordinator's conversation history automatically"
- "Risks of overly narrow task decomposition by the coordinator, leading to incomplete coverage of broad research topics"
- "Designing coordinator agents that analyze query requirements and dynamically select which subagents to invoke rather than always routing through the full pipeline"
- "Partitioning research scope across subagents to minimize duplication (e.g., assigning distinct subtopics or source types to each agent)"
- "Routing all subagent communication through the coordinator for observability, consistent error handling, and controlled information flow"

## Multi-agent research system

- "Our Research system uses a multi-agent architecture with an orchestrator-worker pattern, where a lead agent coordinates the process while delegating to specialized subagents that operate in parallel."
- "multi-agent research systems excel especially for breadth-first queries that involve pursuing multiple independent directions simultaneously."
- "the single agent system failed to find the answer with slow, sequential searches."
- "agents typically use about 4× more tokens than chat interactions, and multi-agent systems use about 15× more tokens than chats."
- "some domains that require all agents to share the same context or involve many dependencies between agents are not a good fit for multi-agent systems today."
- "most coding tasks involve fewer truly parallelizable tasks than research, and LLM agents are not yet great at coordinating and delegating to other agents in real time."
- "Without detailed task descriptions, agents duplicate work, leave gaps, or fail to find necessary information."
- "one subagent explored the 2021 automotive chip crisis while 2 others duplicated work investigating current 2025 supply chains, without an effective division of labor."
- "Simple fact-finding requires just 1 agent with 3-10 tool calls, direct comparisons might need 2-4 subagents with 10-15 calls each, and complex research might use more than 10 subagents with clearly divided responsibilities."
- "Early agents made errors like spawning 50 subagents for simple queries"
- "(1) the lead agent spins up 3-5 subagents in parallel rather than serially; (2) the subagents use 3+ tools in parallel. These changes cut research time by up to 90% for complex queries"
- "Currently, our lead agents execute subagents synchronously, waiting for each set of subagents to complete before proceeding. This simplifies coordination, but creates bottlenecks in the information flow between agents."
- "the entire system can be blocked while waiting for a single subagent to finish searching."
- "Asynchronous execution would enable additional parallelism ... But this asynchronicity adds challenges in result coordination, state consistency, and error propagation across the subagents."
- "Agents are stateful and errors compound."
- "letting the agent know when a tool is failing and letting it adapt works surprisingly well. We combine the adaptability of AI agents built on Claude with deterministic safeguards like retry logic and regular checkpoints."
- "Subagents call tools to store their work in external systems, then pass lightweight references back to the coordinator."

## Building effective agents

- "we recommend finding the simplest solution possible, and only increasing complexity when needed."
- "Agentic systems often trade latency and cost for better task performance"
- Prompt chaining: "The main goal is to trade off latency for higher accuracy, by making each LLM call an easier task."
- Parallelization: "Sectioning: Breaking a task into independent subtasks run in parallel." / "Voting: Running the same task multiple times to get diverse outputs."
- "Parallelization is effective when the divided subtasks can be parallelized for speed, or when multiple perspectives or attempts are needed for higher confidence results."
- Orchestrator-workers: "subtasks aren't pre-defined, but determined by the orchestrator based on the specific input."

## Sub-agents (Claude Code)

- "Each subagent explores its area independently, then Claude synthesizes the findings. This works best when the research paths don't depend on each other."
- "For multi-step workflows, ask Claude to use subagents in sequence. Each subagent completes its task and returns results to Claude, which then passes relevant context to the next subagent."
- "Latency matters. A subagent that isn't a fork starts fresh and may need time to gather context" (en el .md el link de fork está en markdown)
- "Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history"

## Agent SDK — subagents

- "Parallelization: multiple subagents can run concurrently, so independent subtasks finish in the time of the slowest one rather than the sum of all of them."
- La tool se llama `Agent` (antes `Task`): "The tool appears as `"Agent"` in `tool_use` blocks but as `"Task"` in the `system:init` tools list."

## Prompting best practices (platform)

- "Use subagents when tasks can run in parallel, require isolated context, or involve independent workstreams that don't need to share state. For simple tasks, sequential operations, single-file edits, or tasks where you need to maintain context across steps, work directly rather than delegating."

## No respaldado textualmente

- "Hub-and-spoke" / "toda comunicación pasa por el coordinador" no aparece literal en docs; está en la guía del examen. El post describe que los subagentes devuelven resultados al lead agent y la doc de sub-agents que Claude pasa el contexto al siguiente. La pregunta o10-q04 se apoya en eso.
