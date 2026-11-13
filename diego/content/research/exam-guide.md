# CCAR-F: guía oficial del examen (investigación verificada)

Investigado el 13/11/2026. Fuente principal: **Claude Certified Architect – Foundations Exam Guide**, "Version 1.0 · Effective July 2026 · Exam code: CCAR-F · This guide is subject to change without notice."

## URLs leídas

| URL | Qué es | Oficial |
|---|---|---|
| https://anthropic.skilljar.com/claude-certified-architect-foundations-access-request | Página de la certificación en Anthropic Academy (redirige con 302 a la siguiente) | Sí |
| https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification | Página de la certificación en Anthropic Partner Academy. Linkea el PDF de la guía bajo "Please review these documents before your exam session" | Sí |
| https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf | **PDF de la Exam Guide** (8 páginas, alojado en el CDN de Skilljar y linkeado desde la página oficial). Lo bajé completo y extraje el texto con pdftotext | Sí (linkeado por Anthropic) |
| https://claude.com/resources/articles/four-role-based-claude-certifications | Artículo de Anthropic sobre las 4 certificaciones. No trae pesos ni formato | Sí |

Descartados por no ser oficiales (salieron en la búsqueda, no se usaron): tutorialsdojo, substack, cloudthat, whizlabs, dev.to, etc.

## 1. Dominios y pesos: CONFIRMADOS, pero con otra numeración

Cita textual (sección 4, "Exam Content Outline (Blueprint)"):

> "The percentages indicate the approximate proportion of scored items drawn from each domain."

| Dominio oficial | Nombre oficial | Peso | Id interno |
|---|---|---|---|
| 1 | Agentic Architecture & Orchestration | 27% | d1 |
| 2 | Tool Design & MCP Integration | 18% | **d4** |
| 3 | Claude Code Configuration & Workflows | 20% | **d2** |
| 4 | Prompt Engineering & Structured Output | 20% | **d3** |
| 5 | Context Management & Reliability | 15% | d5 |

**Los pesos coinciden exactamente** con los nuestros (27/20/20/18/15). **Pero el orden oficial es distinto**: en la guía, "Domain 2" es Tools/MCP, "Domain 3" es Claude Code y "Domain 4" es Prompt Engineering. Si en algún lado se muestra "Dominio 2", "Task Statement 3.x", etc., hay que usar la numeración oficial, no la de los ids d2/d3/d4.

## 2. Formato del examen: CONFIRMADO

Citas textuales (sección 3, "Exam Details at a Glance"):

- Number of items: **60**
- Item format: "Multiple-choice and multiple-response items; each item states how many responses to select"
- Exam structure: "**4 scenarios drawn from a bank of 6**"
- Time limit: **120 minutes**
- Delivery: "Proctored: online proctored and/or test center, per program policy"
- Passing score: "**Scaled score of 720 on a scale of 100–1,000**"
- Exam fee: $125 USD
- Validity period: 12 months from the date the credential is awarded
- Result reporting: "Pass/fail with scaled score (100–1,000), plus percent-correct by domain on the score report"

Retake (sección 12): "Waiting periods increase with each failed attempt: 14 days after the first, 30 days after the second, and 90 days after the third. You may take an exam up to four times within a rolling twelve-month period."

Los 6 escenarios (sección 5): 1 Customer Support Resolution Agent · 2 Code Generation with Claude Code · 3 Multi-Agent Research System · 4 Developer Productivity with Claude · 5 Claude Code for Continuous Integration · 6 Structured Data Extraction.

## 3. Task statements oficiales (30, no 37)

La guía (sección 6) lista **30 task statements**:

- **Domain 1:** 1.1 Design and implement agentic loops for autonomous task execution · 1.2 Orchestrate multi-agent systems with coordinator-subagent patterns · 1.3 Configure subagent invocation, context passing, and spawning · 1.4 Implement multi-step workflows with enforcement and handoff patterns · 1.5 Apply Agent SDK hooks for tool call interception and data normalization · 1.6 Design task decomposition strategies for complex workflows · 1.7 Manage session state, resumption, and forking
- **Domain 2:** 2.1 Design effective tool interfaces with clear descriptions and boundaries · 2.2 Implement structured error responses for MCP tools · 2.3 Distribute tools appropriately across agents and configure tool choice · 2.4 Integrate MCP servers into Claude Code and agent workflows · 2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively
- **Domain 3:** 3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization · 3.2 Create and configure custom slash commands and skills · 3.3 Apply path-specific rules for conditional convention loading · 3.4 Determine when to use plan mode vs direct execution · 3.5 Apply iterative refinement techniques for progressive improvement · 3.6 Integrate Claude Code into CI/CD pipelines
- **Domain 4:** 4.1 Design prompts with explicit criteria to improve precision and reduce false positives · 4.2 Apply few-shot prompting to improve output consistency and quality · 4.3 Enforce structured output using tool use and JSON schemas · 4.4 Implement validation, retry, and feedback loops for extraction quality · 4.5 Design efficient batch processing strategies · 4.6 Design multi-instance and multi-pass review architectures
- **Domain 5:** 5.1 Manage conversation context to preserve critical information across long interactions · 5.2 Design effective escalation and ambiguity resolution patterns · 5.3 Implement error propagation strategies across multi-agent systems · 5.4 Manage context effectively in large codebase exploration · 5.5 Design human review workflows and confidence calibration · 5.6 Preserve information provenance and handle uncertainty in multi-source synthesis

### Advertencia importante

**Ninguno de los 37 textos de `objectives.json` aparece literalmente en la guía.** Busqué frases distintivas en el texto completo del PDF: "goal-oriented", "sliding window", "cost and turn limits", "prefill", "truncation", "permission modes", "selective retention", "inclusion and exclusion" dan 0 resultados. Los 37 objetivos vienen de otra fuente (¿el score report?) y no son los task statements oficiales.

Por eso **el mapeo de abajo es INFERIDO**: comparé cada objetivo con los bullets "Knowledge of" y "Skills in" de cada task statement. Ese dato queda como `verified: false`. La confianza va por fila.

## 4. Tabla objetivo → dominio → task statement (inferida)

Leyenda: ✔ = coincide con el dominio provisional · ✱ = **cambia** respecto del provisional.

| # | Objetivo (resumido) | Dominio | TS | Conf. | Evidencia en la guía (cita) |
|---|---|---|---|---|---|
| 1 | Múltiples tool calls en un turno, ejecución paralela | d1 ✔ | 1.3 | alta | "Spawning parallel subagents by emitting multiple Task tool calls in a single coordinator response rather than across separate turns" |
| 2 | Reanudar sesión: re-análisis de archivos cambiados, inyección de contexto | **d1 ✱** (antes d5) | 1.7 | alta | "Informing a resumed session about specific file changes for targeted re-analysis rather than requiring full re-exploration" |
| 3 | Prompts de subagentes con todos los hallazgos y la metadata | d1 ✔ | 1.3 | alta | "Including complete findings from prior agents directly in the subagent's prompt" |
| 4 | Delegación orientada a objetivos vs procedural | d1 ✔ | 1.3 | alta | "Designing coordinator prompts that specify research goals and quality criteria rather than step-by-step procedural instructions" |
| 5 | Invocación de subagentes: tool restrictions, scoping, system prompts | d1 ✔ | 1.3 (alt 2.3) | media | "The AgentDefinition configuration including descriptions, system prompts, and tool restrictions for each subagent type" |
| 6 | Diagnosticar spawning mal configurado (permisos, AgentDefinition, wiring) | d1 ✔ | 1.3 | alta | "the requirement that allowedTools must include \"Task\" for a coordinator to invoke subagents" |
| 7 | Descomposición dinámica que se adapta | d1 ✔ | 1.6 | alta | "dynamic adaptive decomposition based on intermediate findings" |
| 8 | Plan mode vs ejecución directa vs multi-fase | d2 ✔ | 3.4 | alta | "Determine when to use plan mode vs direct execution" |
| 9 | Persistencia de estado en pipelines multi-agente para reanudar | **d5 ✱** (antes d1) | 5.4 | alta | "Structured state persistence for crash recovery: each agent exports state to a known location, and the coordinator loads a manifest on resume" |
| 10 | Patrones de orquestación: coordinador-worker, paralelo, secuencial | d1 ✔ | 1.2 (alt 1.6) | media | "Hub-and-spoke architecture where a coordinator agent manages all inter-subagent communication" |
| 11 | CLI en CI/CD: flags no interactivos, permisos, límites | d2 ✔ | 3.6 | alta | "Running Claude Code in CI with the -p flag to prevent interactive input hangs" (los límites de costo y turnos NO aparecen en la guía) |
| 12 | Refinamiento iterativo: ejemplos de entrada y salida, feedback, issues en lote | **d2 ✱** (antes d3) | 3.5 | alta | "Apply iterative refinement techniques for progressive improvement" (está en Domain 3, Claude Code) |
| 13 | Config de review en Claude Code: estándares, tools restringidas, output estructurado | d2 ✔ | 3.6 | alta | "Using --output-format json with --json-schema to produce machine-parseable structured findings" |
| 14 | context: fork en skills y comandos | d2 ✔ | 3.2 | alta | "The context: fork frontmatter option for running skills in an isolated sub-agent context" |
| 15 | Calidad de tests generados: tests existentes, fixtures, criterios | d2 ✔ | 3.6 | alta | "Documenting testing standards, valuable test criteria, and available fixtures in CLAUDE.md" |
| 16 | Elegir mecanismo de config (CLAUDE.md, rules, Skills, hooks, permisos) | d2 ✔ | 3.1 (alt 3.2, 3.3, 1.5) | media | "Choosing between skills (on-demand invocation…) and CLAUDE.md (always-loaded universal standards)". Ojo: los hooks como enforcement aparecen en 1.4 y 1.5 (Agent SDK) |
| 17 | Explorar el codebase con Grep, Glob y Read de forma incremental | **d4 ✱** (antes d5) | 2.5 (alt 5.4) | media | "Building codebase understanding incrementally: starting with Grep to find entry points, then using Read to follow imports" |
| 18 | Schemas de salida de subagentes: datos, prosa, metadata de citas | **d5 ✱** (antes d1) | 5.6 (alt 5.1) | media | "Rendering different content types appropriately in synthesis outputs—financial data as tables, news as prose…" |
| 19 | Síntesis que preserva la incertidumbre: hallazgos establecidos vs disputados | d5 ✔ | 5.6 | alta | "explicit sections distinguishing well-established findings from contested ones" |
| 20 | Aislamiento con subagentes, scratchpad, lectura dirigida | d5 ✔ | 5.4 | alta | "The role of scratchpad files for persisting key findings across context boundaries" |
| 21 | Optimización de la ventana: resumen, estado estructurado, retención selectiva | d5 ✔ | 5.1 | alta | "Extracting transactional facts … into a persistent \"case facts\" block" |
| 22 | Routing a revisión humana por confianza | d5 ✔ | 5.5 | alta | "Routing extractions with low model confidence or ambiguous/contradictory source documents to human review" |
| 23 | Messages API vs Message Batches API | d3 ✔ | 4.5 | alta | "synchronous API for blocking pre-merge checks, batch API for overnight/weekly analysis" |
| 24 | Pasadas de review especializadas por concern, con few-shot | d3 ✔ | 4.6 (alt 4.2) | media | "Design multi-instance and multi-pass review architectures" (la división por concern, como seguridad o lógica de negocio, no aparece literal) |
| 25 | Elegir método de salida estructurada (tool use, prompt, prefill) | d3 ✔ | 4.3 | alta | "Tool use (tool_use) with JSON schemas as the most reliable approach for guaranteed schema-compliant structured output" |
| 26 | Schemas de extracción: opcional, nullable, enums | d3 ✔ | 4.3 | alta | "Designing schema fields as optional (nullable) when source documents may not contain the information" |
| 27 | Tool use con schema y tool_choice para garantizar la invocación | **d3 ✱** (antes d4) | 4.3 (alt 2.3) | media | "Setting tool_choice: \"any\" to guarantee structured output when multiple extraction schemas exist" (4.3). 2.3 también cubre tool_choice |
| 28 | Truncamiento: partir en llamadas chicas y mergear | d3 ✔ | 4.6 (alt 1.6) | **baja** | "splitting large reviews into per-file local analysis passes". El truncamiento y max_tokens NO aparecen como tema en la guía |
| 29 | Patrones de precisión en extracción: schemas, normalización, few-shot | d3 ✔ | 4.2 (alt 4.3) | media | "The effectiveness of few-shot examples for reducing hallucination in extraction tasks" |
| 30 | Bajar falsos positivos con convenciones persistentes y exclusiones | d3 ✔ | 4.1 (alt 3.6, 4.2) | media | "Writing specific review criteria that define which issues to report … versus skip". Si el foco es "persistent context", también encaja en 3.6 (CLAUDE.md en CI) |
| 31 | Criterios explícitos de inclusión y exclusión | d3 ✔ | 4.1 | alta | "The importance of explicit criteria over vague instructions" |
| 32 | Elegir la tool built-in (Grep, Glob, Read, Bash) | d4 ✔ | 2.5 | alta | "Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively" |
| 33 | Distribución de tools en multi-agente | d4 ✔ | 2.3 | alta | "Restricting each subagent's tool set to those relevant to its role" |
| 34 | MCP resources vs tools | d4 ✔ | 2.4 | alta | "Exposing content catalogs as MCP resources to give agents visibility into available data without requiring exploratory tool calls" |
| 35 | Integrar MCP: scope, auth con env vars, discovery | d4 ✔ | 2.4 | alta | "MCP server scoping: project-level (.mcp.json) … vs user-level (~/.claude.json)" |
| 36 | Descriptions de tools MCP | d4 ✔ | 2.1 | alta | "Tool descriptions as the primary mechanism LLMs use for tool selection" |
| 37 | tool_choice y secuenciación multi-tool | d4 ✔ | 2.3 (alt 4.3) | alta | "Using tool_choice forced selection to ensure a specific tool is called first (e.g., forcing extract_metadata before enrichment tools), then processing subsequent steps in follow-up turns" |

**Distribución resultante:** d1 = 8 · d2 = 7 · d3 = 9 · d4 = 7 · d5 = 6 (total 37).

**Task statements oficiales que ningún objetivo cubre directamente:** 1.1 (agentic loop y stop_reason), 1.4 (enforcement con prerequisitos y handoff), 1.5 (hooks del Agent SDK), 2.2 (errores MCP estructurados con isError), 3.3 (rules con path-scoping como tema propio; en el objetivo 16 aparece solo de forma parcial), 4.4 (validación, retry y feedback loops), 5.2 (escalamiento), 5.3 (propagación de errores). Ojo: varias son zonas rojas del diagnóstico (enforcement vs guidance).
