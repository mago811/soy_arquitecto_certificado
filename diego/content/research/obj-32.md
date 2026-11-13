# Research — Objetivo 32 (elegir Grep, Glob, Read o Bash)

Fecha de lectura: 2026-11-13. Página principal: https://code.claude.com/docs/en/tools-reference.md

## URLs consultadas

- https://code.claude.com/docs/en/tools-reference
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/cli-reference
- Guía del examen, Task Statement 2.5

## Guía del examen — Task Statement 2.5

- "Grep for content search (searching file contents for patterns like function names, error messages, or import statements)"
- "Glob for file path pattern matching (finding files by name or extension patterns)"
- "Read/Write for full file operations; Edit for targeted modifications using unique text matching"
- "When Edit fails due to non-unique text matches, using Read + Write as a fallback for reliable file modifications"

## Tabla de herramientas (tools-reference)

- `Bash`: "Executes shell commands in your environment." — Permission required: Yes
- `Glob`: "Finds files based on pattern matching. Absent by default on macOS, Linux, and WSL." — No
- `Grep`: "Searches for patterns in file contents. Absent by default on macOS, Linux, and WSL." — No
- `Read`: "Reads the contents of files." — No
- `Edit`: "Makes targeted edits to specific files." — Yes
- `Write`: "Creates or overwrites files." — Yes
- "`Bash` is marked Yes but runs a built-in set of [read-only commands] without prompting."

## Glob

- "The Glob tool finds files by name pattern. On Windows, it's part of the default tool set. On macOS, Linux, and WSL, Claude Code leaves Glob and [Grep] out of the default tool set, and Claude searches with `find` and `grep` through the Bash tool instead."
- Vuelven si: se nombran en `--tools`/`--allowedTools`; Bash se remueve por deny/`--disallowedTools`/`--restricted`; o un subagente "lists `Glob` or `Grep` in its `tools` field and leaves out `Bash`".
- "`**/*.js` matches all `.js` files at any depth"
- "Results are sorted by modification time and capped at 100 files."
- "Glob doesn't respect `.gitignore` by default, so it finds gitignored files alongside tracked ones. This differs from [Grep], which skips gitignored files."

## Grep

- "The Grep tool searches file contents for patterns. Where [Glob] finds files by name, Grep finds lines inside them."
- "Patterns that include regex metacharacters need escaping. For example, finding `interface{}` in Go code takes the pattern `interface\{\}`."

## Read

- "Read only reads files, not directories. Claude lists directory contents with a shell command such as `ls`."
- "Read refuses a file whose extension it treats as binary, such as `.xlsx`, `.parquet`, `.heic`, or `.zip`."
- PDFs: "For PDFs longer than 10 pages, it reads in ranges with a `pages` parameter"

## Edit / Write

- "The Edit tool performs exact string replacement. It takes an `old_string` and a `new_string` and replaces the first with the second. It doesn't use regex or fuzzy matching."
- "Uniqueness: `old_string` must appear exactly once. When it appears more than once, Claude either supplies a longer string with enough surrounding context to pin down one occurrence, or sets `replace_all: true` to replace them all."
- "The Write tool creates a new file or overwrites an existing one with the full content provided. It doesn't append or merge."

## Bash

- "The Bash tool runs each command in a separate process."
- "Environment variables don't persist. An `export` in one command won't be available in the next."

## Best practices

- "Give a custom subagent in `.claude/agents/` only `tools: Read, Grep, Glob`. Now it's a reviewer that can't edit anything, and that limit is enforced by Claude Code rather than requested in a prompt."

## Nota importante para las preguntas

En macOS/Linux/WSL, Glob y Grep no están en el set por defecto: Claude usa `find`/`grep` vía Bash. Las preguntas que piden "elegir Glob/Grep" se plantean en contextos donde esas tools están disponibles (subagente con `tools: Read, Grep, Glob`, Agent SDK, Windows) o preguntan por la NATURALEZA de la búsqueda (por nombre vs. por contenido), que es lo que evalúa el examen.
