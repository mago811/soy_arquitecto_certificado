# Research — Objetivo 20 (contexto en exploraciones largas: subagentes, scratchpad, lectura dirigida)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://code.claude.com/docs/en/context-window
- https://code.claude.com/docs/en/how-claude-code-works
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/costs
- https://code.claude.com/docs/en/commands
- https://code.claude.com/docs/en/memory
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Guía del examen (PDF linkeado desde https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification), Task Statement 5.4

## Guía del examen — Task Statement 5.4

- "Context degradation in extended sessions: models start giving inconsistent answers and referencing "typical patterns" rather than specific classes discovered earlier"
- "The role of scratchpad files for persisting key findings across context boundaries"
- "Subagent delegation for isolating verbose exploration output while the main agent coordinates high-level understanding"
- "Structured state persistence for crash recovery: each agent exports state to a known location, and the coordinator loads a manifest on resume"
- Skills: "Summarizing key findings from one exploration phase before spawning sub-agents for the next phase, injecting summaries into initial context"; "Using /compact to reduce context usage during extended exploration sessions when context fills with verbose discovery output"

## Context window (code.claude.com/docs/en/context-window)

- "a [subagent] handles the research in its own separate context window, so the large file reads stay out of yours. Only the summary and a small metadata trailer come back."
- Tabla "What survives compaction": project-root CLAUDE.md y reglas sin paths "Re-injected from disk"; "Rules with `paths:` frontmatter | Claude Code reloads them on demand"; "Files Claude read or edited | Claude Code re-reads up to five, most recently modified first"; "Context that hooks added earlier | Summarized with the rest of the conversation".
- "Path-scoped rules and nested CLAUDE.md files load into message history when Claude reads, writes, or edits their trigger file, so compaction summarizes them away with everything else. If a rule must persist across compaction, drop the `paths:` frontmatter or move it to the project-root CLAUDE.md."
- "Claude Code compacts automatically as you approach the limit, so a full context window doesn't end your session."
- "Compact with a focus: run `/compact` with instructions, like `/compact focus on the auth bug fix`, before starting a long new task. The summary keeps what you choose instead of what the automatic pass guesses is important."
- "Compact earlier: run `/autocompact` with a token count, like `/autocompact 500k`, to set how full the context window gets before the automatic pass runs."
- "Clear between tasks: run `/clear` when switching to unrelated work. Old conversation crowds out the files you need next and costs tokens on every message."
- "Delegate large reads: send research to a [subagent] so the file contents stay in its context window, not yours."
- "run `/context` for a live breakdown by category with optimization suggestions"

## How Claude Code works

- "Sessions are independent. Each new session starts with a fresh context window, without the conversation history from previous sessions."
- "The summary keeps your requests and key code snippets, but detailed instructions from early in the conversation may be lost. Put persistent rules in CLAUDE.md rather than relying on conversation history."
- "Subagents work in their own context window. A subagent starts fresh unless it's a fork, which starts with a copy of your conversation so far. Either way, the subagent's tool calls stay out of your context, and Claude gets back a summary when the subagent finishes."

## Memory

- "Project-root CLAUDE.md survives compaction: after `/compact`, Claude re-reads it from disk and re-injects it into the session."
- "Add conversation-only instructions to CLAUDE.md to make them persist."

## Best practices (Claude Code)

- "Keeping long output, like a full test run or a wide search, out of your main conversation, where it would otherwise ride along for the rest of the session"
- "a fresh subagent first has to gather context your conversation already had, so it can end up *slower* than doing the task where you are."
- "Ask for short summaries back, so twenty results don't fill your context anyway."
- "`/clear` between unrelated tasks. It costs nothing, and it means the next task doesn't keep paying for the previous one's history."
- "On a long session `/compact` is itself a big request, since it reads the whole conversation to summarize it"
- Tabla "What you can stop doing": "Running out of context is rarely the problem anymore. Subagents are still great for parallel work, keeping noisy output out of your way, and independent review, but each of those costs extra tokens." (OJO: la doc actual relativiza "proteger la ventana"; las preguntas se apoyan en "noisy output"/"verbose output", no en "te quedás sin contexto").

## Sub-agents

- "Use one when a side task would flood your main conversation with search results, logs, or file contents you won't reference again: the subagent does that work in its own context and returns only the summary."
- Explore: "A fast, read-only agent optimized for searching and analyzing codebases." / "Claude delegates to Explore when it needs to search or understand a codebase without making changes. This keeps exploration results out of your main conversation context." / thoroughness "quick", "medium", "very thorough".
- "By delegating these to a subagent, the verbose output stays in the subagent's context while only the relevant summary returns to your main conversation."
- "When subagents complete, their results return to your main conversation. Running many subagents that each return detailed results can consume significant context"
- "Each subagent starts with a fresh, isolated context window. It doesn't see your conversation history, the skills you've already invoked, or the files Claude has already read. Claude composes a delegation message that summarizes the task, and the subagent works from there."
- "The built-in Explore and Plan agents are one-shot and return no agent ID, so Claude can't resume them. Use `general-purpose` or a custom subagent when you need to continue the work."
- "Resumed subagents retain their full conversation history, including all previous tool calls, results, and reasoning."
- Memory: "The `memory` field gives the subagent a persistent directory that survives across conversations." Scopes `user` / `project` / `local`; "`project` is the recommended default scope. It makes subagent knowledge shareable via version control."
- "Subagents support automatic compaction."

## Costs

- "Delegate verbose operations to subagents ... so the verbose output stays in the subagent's context while only a summary returns to your main conversation."
- "You can also customize compaction behavior in your CLAUDE.md file at the root of your project" con un bloque `# Compact instructions`.
- "Use `/rename` before clearing so you can find the session later, then `/resume` to return to it."

## Commands

- "`/clear [name]` | Start a new conversation with empty context. ... To free up context while continuing the same conversation, use `/compact` instead."
- "`/compact [instructions]` | Free up context by summarizing the conversation so far. Optionally pass focus instructions for the summary."
- "`/context [all]` | Visualize current context usage as a colored grid."

## Platform prompting best practices (multi-context-window)

- "When a context window is cleared, consider starting with a brand new context window rather than using compaction. Claude’s latest models are extremely effective at discovering state from the local filesystem."
- "“Review progress.txt, tests.json, and the git logs.”"
- "Use git for state tracking: Git provides a log of what’s been done and checkpoints that can be restored."

## Engineering — effective context engineering

- "Structured note-taking, or agentic memory, is a technique where the agent regularly writes notes persisted to memory outside of the context window. These notes get pulled back into the context window at later times."
- "Like Claude Code creating a to-do list, or your custom agent maintaining a NOTES.md file, this simple pattern allows the agent to track progress across complex tasks"

## Lo que NO se pudo respaldar en doc oficial

- La palabra "scratchpad" no aparece en code.claude.com: la doc habla de "structured note-taking", `NOTES.md`, `progress.txt` y del `memory` de subagentes. Se usa "scratchpad" como término de la guía.
- "Manifest" para crash recovery: solo en la guía del examen.
