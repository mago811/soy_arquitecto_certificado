# Research — Objetivo 7 (descomposición dinámica de tareas)

Fecha de lectura: 2026-11-13.

## URLs consultadas

- https://www.anthropic.com/engineering/multi-agent-research-system (redirige a /research/…)
- https://www.anthropic.com/engineering/building-effective-agents (redirige a /research/…)
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://code.claude.com/docs/en/sub-agents
- Guía del examen (PDF linkeado desde https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification), Task Statement 1.6

## Guía del examen (TS 1.6)

- "When to use fixed sequential pipelines (prompt chaining) versus dynamic adaptive decomposition based on intermediate findings"
- "Prompt chaining patterns that break reviews into sequential steps (e.g., analyze each file individually, then run a cross-file integration pass)"
- "The value of adaptive investigation plans that generate subtasks based on what is discovered at each step"
- "Selecting task decomposition patterns appropriate to the workflow: prompt chaining for predictable multi-aspect reviews, dynamic decomposition for open-ended investigation tasks"
- "Splitting large code reviews into per-file local analysis passes plus a separate cross-file integration pass to avoid attention dilution"
- "Decomposing open-ended tasks (e.g., "add comprehensive tests to a legacy codebase") by first mapping structure, identifying high-impact areas, then creating a prioritized plan that adapts as dependencies are discovered"

## Building effective agents

- "Workflows are systems where LLMs and tools are orchestrated through predefined code paths."
- "Agents, on the other hand, are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks."
- Prompt chaining: "Prompt chaining decomposes a task into a sequence of steps, where each LLM call processes the output of the previous one. You can add programmatic checks (see "gate” in the diagram below) on any intermediate steps to ensure that the process is still on track."
- "This workflow is ideal for situations where the task can be easily and cleanly decomposed into fixed subtasks. The main goal is to trade off latency for higher accuracy, by making each LLM call an easier task."
- Orchestrator-workers: "In the orchestrator-workers workflow, a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results."
- "This workflow is well-suited for complex tasks where you can’t predict the subtasks needed (in coding, for example, the number of files that need to be changed and the nature of the change in each file likely depend on the task)."
- "the key difference from parallelization is its flexibility—subtasks aren't pre-defined, but determined by the orchestrator based on the specific input."
- Parallelization: "For complex tasks with multiple considerations, LLMs generally perform better when each consideration is handled by a separate LLM call, allowing focused attention on each specific aspect."
- Agents: "During execution, it's crucial for the agents to gain “ground truth” from the environment at each step (such as tool call results or code execution) to assess its progress."
- "Agents can be used for open-ended problems where it’s difficult or impossible to predict the required number of steps, and where you can’t hardcode a fixed path."
- "workflows offer predictability and consistency for well-defined tasks, whereas agents are the better option when flexibility and model-driven decision-making are needed at scale."

## Multi-agent research system

- "Research work involves open-ended problems where it’s very difficult to predict the required steps in advance. You can’t hardcode a fixed path for exploring complex topics, as the process is inherently dynamic and path-dependent."
- "When people conduct research, they tend to continuously update their approach based on discoveries, following leads that emerge during investigation."
- "The model must operate autonomously for many turns, making decisions about which directions to pursue based on intermediate findings. A linear, one-shot pipeline cannot handle these tasks."
- "our architecture uses a multi-step search that dynamically finds relevant information, adapts to new findings, and analyzes results to formulate high-quality answers."
- "The LeadResearcher synthesizes these results and decides whether more research is needed—if so, it can create additional subagents or refine its strategy."
- "In our system, the lead agent decomposes queries into subtasks and describes them to subagents. Each subagent needs an objective, an output format, guidance on the tools and sources to use, and clear task boundaries."
- "Subagents also plan, then use interleaved thinking after tool results to evaluate quality, identify gaps, and refine their next query."
- "strategies like decomposing difficult questions into smaller tasks, carefully evaluating the quality of sources, adjusting search approaches based on new information"

## Prompting best practices (platform)

- "Explicit prompt chaining (breaking a task into sequential API calls) is still useful when you need to inspect intermediate outputs or enforce a specific pipeline structure."
- "Prefer general instructions over prescriptive steps."
- Muestra de prompt de research: "Regularly self-critique your approach and plan. Update a hypothesis tree or research notes file to persist information and provide transparency."
- "Use the first context window to set up a framework (write tests, create setup scripts), then use future context windows to iterate on a todo-list."

## Sub-agents (Claude Code)

- "For multi-step workflows, ask Claude to use subagents in sequence. Each subagent completes its task and returns results to Claude, which then passes relevant context to the next subagent."

## No respaldado textualmente

- "per-file local passes + cross-file integration pass" y "attention dilution" solo aparecen en la guía del examen. La pregunta o07-q04 se apoya en la cita de "Building effective agents" sobre una llamada por consideración.
