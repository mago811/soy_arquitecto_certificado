# Syllabus maestro — CCAR-F Retake (días 1–19)

Solo índice: qué se cubre, cuánto quiz, qué lab, qué mazos. Nada desarrollado.
Iconos: 📱 = se puede hacer desde el móvil (leer teoría, quiz, flashcards) · 💻 = código o práctica en la máquina.
Fechas y días según `data/plan.json` (manda sobre el prompt: simulacros = días 12 y 18).

| Día | Temas exactos | Quiz | Lab (`labs/`) | Mazos afectados |
|-----|---------------|------|---------------|-----------------|
| 1 · Lun 3/8 | 📱 Matriz de mecanismos: CLAUDE.md vs permissions (allow/deny) vs hooks (PreToolUse/PostToolUse) · 📱 guidance vs enforcement: cuándo y por qué falla guidance · 💻 jerarquía de settings.json (user/project/local) | `day-01.json` · 10 | 💻 `day-01-enforcement.md`: "La regla que CLAUDE.md no puede sostener" | `mecanismos-config` (nuevo, ~8 cards) |
| 2 · Mar 4/8 | 📱 Scopes MCP: project (.mcp.json) / user / local — visibilidad, credenciales, precedencia · 💻 configurar el mismo server en los 3 scopes · 📱 métodos de contexto: @ references vs CLAUDE.md vs inline | `day-02.json` · 10 (5+5) | 💻 `day-02-mcp-scopes.md`: "Un server, tres scopes" | `scopes-mcp` (nuevo, ~6) · `mecanismos-config` (+4 de contexto) |
| 3 · Mié 5/8 | 📱 Messages API stateless: historial completo por request, roles user/assistant, tool_result dentro del historial, no existe conversation_id ni sesión server-side | `day-03.json` · 8 | 💻 `day-03-api-stateless.md`: "El chatbot que olvida" | `api-stateless` (nuevo, ~5) |
| 4 · Jue 6/8 | 📱 tool_choice: auto / any / tool / none — qué garantiza y qué no cada uno · 📱 disable_parallel_tool_use · 💻 secuenciación de tools dependientes con requests encadenados · 📱 stop_reason tool_use | `day-04.json` · 10 | 💻 `day-04-tool-choice.md`: "Dos tools, un orden obligatorio" | `tool-choice` (nuevo, ~6) |
| 5 · Vie 7/8 | 📱 Schemas de extracción: required vs optional vs nullable, enums para valores cerrados, por qué required no evita fabricación | `day-05.json` · 8 | 💻 `day-05-schemas.md`: "Documento incompleto, cero inventos" | `anti-fabricacion` (nuevo, ~6) |
| 6 · Sáb 8/8 | 📱 Extraction accuracy: few-shot que incluye nulls, normalización de formatos · 📱 repaso integrador de las 6 zonas rojas | `day-06.json` · consolidado 15–20 (todas las rojas) | 💻 `day-06-accuracy.md`: "Few-shot al extractor del día 5" | `anti-fabricacion` (+4) |
| 7 · Dom 9/8 | 📱 Checkpoint: autoexamen escrito de memoria (matriz, tool_choice, scopes, anti-fabricación) y corrección contra flashcards | — (re-intento de day-01…06) | — | — (repaso de todos) |
| 8 · Lun 10/8 | 📱 MCP profundo: error handling tipado (is_error), tool descriptions que desambiguan, auth por env vars · 💻 aplicado a un server real | `day-08.json` · 10 | 💻 `day-08-mcp-profundo.md`: "Server con errores tipados y auth" | `scopes-mcp` (+5) |
| 9 · Mar 11/8 | 📱 Descomposición dinámica de subtareas (orchestrator-workers) · 📱 iterative refinement: feedback concreto, issues batcheados | `day-09.json` · 9 | — (sin lab según plan) | — |
| 10 · Mié 12/8 | 📱 Exploración de codebase: patrón incremental Glob → Grep → Read · 📱 session resumption (--continue / --resume) | `day-10.json` · 8 | — | — |
| 11 · Jue 13/8 | 📱 Confirmación de fortalezas: orquestación, hooks, Batches vs Messages, structured output, context mgmt, review loops | `day-11.json` · 10 | — | — |
| 12 · Vie 14/8 | 📱 SIMULACRO #1 (condiciones reales, 120 min) | `simulacro-1.json` · 60 (~45% rojas / 30% amarillas / 25% fortalezas) | — | — |
| 13 · Sáb 15/8 | 📱 Análisis simulacro #1 — sin contenido pre-generado; refuerzos bajo demanda (Etapa 5) | bajo demanda | — | — |
| 14–16 · 16–18/8 | 🔵 Buffer/contención: recuperar salteados o reforzar — solo Etapa 5 bajo demanda | bajo demanda | — | — |
| 17 · Mié 19/8 | 📱 Segunda vuelta a los 2 peores objetivos del semáforo (con tu export del dashboard) | 2× `refuerzo-<tema>.json` · 5 c/u | — | — |
| 18 · Jue 20/8 | 📱 SIMULACRO #2 — objetivo 90%+ · incluye 8–10 preguntas sobre tus fallos del #1 | `simulacro-2.json` · 60 | — | — |
| 19 · Vie 21/8 | 📱 Análisis simulacro #2 + armado del mazo de cierre con lo que siga flojo | — | — | `cierre` (nuevo, según fallos) |

**Totales:** 11 quizzes diarios/consolidados + 2 simulacros + refuerzos bajo demanda · 6 labs (días 1–6, 8) · 6 mazos nuevos (`mecanismos-config`, `scopes-mcp`, `api-stateless`, `tool-choice`, `anti-fabricacion`, `cierre`) + `principios-oro` existente.

**Nota móvil:** el dashboard corre en localhost — para hacer quizzes/flashcards 📱 desde el teléfono hay que servirlo en la LAN (`python -m http.server 8000` y entrar por la IP de la PC) o es tema para el coach (`notes/para-el-coach.md`).
