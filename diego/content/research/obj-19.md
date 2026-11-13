# Research — Objetivo 19 (síntesis que conserva la incertidumbre)

Fecha de lectura: 2026-11-13. Páginas de platform.claude.com leídas en su versión Markdown (`<url>.md`); el post de ingeniería, en HTML convertido a texto.

## URLs consultadas

- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- https://platform.claude.com/docs/en/build-with-claude/citations
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://www.anthropic.com/engineering/multi-agent-research-system
- Guía del examen (PDF linkeado desde https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification), Task Statement 5.6

## Guía del examen — TS 5.6 (cita textual del PDF)

- Knowledge: "How source attribution is lost during summarization steps when findings are compressed without preserving claim-source mappings"
- Knowledge: "How to handle conflicting statistics from credible sources: annotating conflicts with source attribution rather than arbitrarily selecting one value"
- Knowledge: "Temporal data: requiring publication/collection dates in structured outputs to prevent temporal differences from being misinterpreted as contradictions"
- Skill: "Structuring reports with explicit sections distinguishing well-established findings from contested ones, preserving original source characterizations and methodological context"
- Skill: "Completing document analysis with conflicting values included and explicitly annotated, letting the coordinator decide how to reconcile before passing to synthesis"

Nota: estas frases NO se usan como `source_quote` (el host del PDF no es doc oficial de producto). Sirven de marco; cada respuesta correcta se apoya en una frase de la doc.

## Reduce hallucinations

- "Explicitly give Claude permission to admit uncertainty. This technique can drastically reduce false information."
- Ejemplo de prompt: "If you're unsure about any aspect or if the report lacks necessary information, say \"I don't have enough information to confidently assess this.\""
- "For tasks involving long documents (>20k tokens), ask Claude to extract word-for-word quotes first before performing its task."
- "Make Claude’s response auditable by having it cite quotes and sources for each of its claims. You can also have Claude verify each claim by finding a supporting quote after it generates a response. If it can’t find a quote, it must retract the claim."
- Ejemplo: "If you can't find a supporting quote for a claim, remove that claim from the press release and mark where it was removed with empty [] brackets."
- "Best-of-N verification: Run Claude through the same prompt multiple times and compare the outputs. Inconsistencies across outputs could indicate hallucinations."
- "Explicitly instruct Claude to only use information from provided documents and not its general knowledge."
- "Remember, although these techniques significantly reduce hallucinations, they don’t eliminate them entirely. Always validate critical information, especially for high-stakes decisions."

## Citations

- "Because the API parses citations into the response formats described in the following sections and extracts `cited_text` directly, citations are guaranteed to contain valid pointers to the provided documents."
- "In Anthropic’s evaluations, the citations feature is significantly more likely to cite the most relevant quotes from documents than purely prompt-based approaches."
- "If your prompt-based approach asks Claude to output direct quotes, you might see cost savings because `cited_text` does not count toward your output tokens."
- "Set `citations.enabled=true` on each of your documents. Currently, citations must be enabled on all or none of the documents within a request."
- "`title` and `context` are optional fields that are passed to the model but not used toward cited content."
- "`title` is limited in length, so the `context` field is useful for storing document metadata as text or stringified JSON."
- "Citations cannot be used together with structured outputs." / "If you enable citations on any user-provided document (`document` blocks or `search_result` blocks) and also include the `output_config.format` parameter (or the deprecated `output_format` parameter), the API returns a 400 error."
- Respuesta: bloques `text` con `citations` (tipos `char_location`, `page_location`, `content_block_location`; campos `cited_text`, `document_index`, `document_title`).
- Formato del bloque document (ejemplo Python): `{"type": "document", "source": {"type": "text", "media_type": "text/plain", "data": ...}, "title": ..., "context": ..., "citations": {"enabled": True}}`.

## Prompting best practices

- "When using multiple documents, wrap each document in `<document>` tags with `<document_content>` and `<source>` (and other metadata) subtags for clarity."
- "Ground responses in quotes: For long document tasks, ask Claude to quote relevant parts of the documents first before carrying out its task."
- Research: "Encourage source verification: Ask Claude to verify information across multiple sources."
- Prompt de ejemplo: "As you gather data, develop several competing hypotheses. Track your confidence levels in your progress notes to improve calibration. Regularly self-critique your approach and plan."

## Multi-agent research system (engineering)

- "passes all findings to a CitationAgent, which processes the documents and research report to identify specific locations for citations. This ensures all claims are properly attributed to their sources."
- Rúbrica del LLM judge: "factual accuracy (do claims match sources?), citation accuracy (do the cited sources match the claims?), completeness (are all requested aspects covered?), source quality (did it use primary sources over lower-quality secondary sources?)"
- "human testers noticed that our early agents consistently chose SEO-optimized content farms over authoritative but less highly-ranked sources like academic PDFs or personal blogs. Adding source quality heuristics to our prompts helped resolve this issue."
- "Subagents call tools to store their work in external systems, then pass lightweight references back to the coordinator. This prevents information loss during multi-stage processing and reduces token overhead from copying large outputs through conversation history."
- Heurísticas: "carefully evaluating the quality of sources, adjusting search approaches based on new information".

## Lo que la doc NO dice (no usar como respuesta correcta)

- No hay un parámetro de API para "nivel de confianza" de un hallazgo ni para marcar "contested": se hace con prompt + estructura del output.
- La doc no dice que haya que promediar ni elegir la fuente más reciente ante un conflicto.
