# Research — Objetivo 17 (explorar un codebase con Grep, Glob y Read de forma incremental)

Fecha de lectura: 2026-11-13. Páginas leídas en su versión Markdown (`<url>.md`).

## URLs consultadas

- https://code.claude.com/docs/en/tools-reference
- https://code.claude.com/docs/en/costs
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/cli-reference (flags `--tools` y `--allowedTools`, para el lab)
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Guía del examen, Task Statement 2.5

## Guía del examen — Task Statement 2.5

- "Building codebase understanding incrementally: starting with Grep to find entry points, then using Read to follow imports and trace flows, rather than reading all files upfront"
- "Tracing function usage across wrapper modules by first identifying all exported names, then searching for each name across the codebase"

## Tools reference — Grep

- "The Grep tool searches file contents for patterns. Where [Glob] finds files by name, Grep finds lines inside them."
- "Grep is built on [ripgrep] and uses ripgrep's regex syntax, not POSIX grep."
- Output modes: "`files_with_matches`: file paths only, no line content. This is the default." / "`content`: matching lines with file and line number." / "`count`: match count per file, followed by a total across all matching files."
- "Claude can scope results by file with the `glob` parameter, such as `**/*.tsx`, or by language with the `type` parameter, such as `py` or `rust`. By default, patterns match within a single line. Claude can set `multiline: true` to match across line boundaries."
- "Grep respects `.gitignore`, so gitignored files are skipped. To search a gitignored file, Claude passes its path directly."

## Tools reference — Glob

- "The Glob tool finds files by name pattern."
- "On macOS, Linux, and WSL, Claude Code leaves Glob and [Grep] out of the default tool set, and Claude searches with `find` and `grep` through the Bash tool instead."
- "Results are sorted by modification time and capped at 100 files. If the cap is hit, Claude sees a truncation flag in the result and can narrow the pattern."
- "Glob doesn't respect `.gitignore` by default, so it finds gitignored files alongside tracked ones."

## Tools reference — Read (archivos grandes)

- "The Read tool takes a file path and returns the contents with line numbers."
- "By default one call returns at most 25,000 tokens, or the value you set in [`CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`], and refuses a whole file over 256 KB, so Claude reads a larger file in pages with `offset` and `limit`."
- "Whole file over the token limit: the first page of the file, with a `PARTIAL view` notice"

## Costs — code intelligence y prompts específicos

- "Code intelligence plugins give Claude precise symbol navigation instead of text-based search, reducing unnecessary file reads when exploring unfamiliar code. A single "go to definition" call replaces what might otherwise be a grep followed by reading multiple candidate files."
- "Vague requests like "improve this codebase" trigger broad scanning. Specific requests like "add input validation to the login function in auth.ts" let Claude work efficiently with minimal file reads."

## Engineering — effective context engineering (just-in-time)

- "agents built with the “just in time” approach maintain lightweight identifiers (file paths, stored queries, web links, etc.) and use these references to dynamically load data into context at runtime using tools."
- "Agents can assemble understanding layer by layer, maintaining only what's necessary in working memory"
- "CLAUDE.md files are naively dropped into context up front, while primitives like glob and grep allow it to navigate its environment and retrieve files just-in-time"

## CLI reference (para el lab)

- `--tools`: "On macOS, Linux, and WSL, the default set leaves out `Glob` and `Grep`".
- tools-reference: "With `--tools` you get the ones you list, and naming either tool in `--allowedTools` restores both."

## Lo que NO se pudo respaldar en doc oficial

- La estrategia "identificar los nombres exportados por un wrapper y después grep por cada uno" está en la guía del examen, no en la doc. La pregunta que la usa (o17-q02) cita la definición de Grep (busca contenido) como respaldo parcial.
