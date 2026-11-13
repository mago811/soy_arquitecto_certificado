# Research — Objetivo 22 (ruteo a revisión humana por confianza)

Fecha de lectura: 2026-11-13. Páginas de platform.claude.com leídas en su versión Markdown (`<url>.md`); el post de ingeniería, en HTML convertido a texto.

## URLs consultadas

- https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation
- https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing
- https://platform.claude.com/docs/en/about-claude/use-case-guides/legal-summarization
- https://platform.claude.com/docs/en/about-claude/use-case-guides/customer-support-chat
- https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
- https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/build-with-claude/citations
- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Guía del examen (PDF), Task Statement 5.5

## Guía del examen — TS 5.5 (cita textual del PDF)

- "The risk that aggregate accuracy metrics (e.g., 97% overall) may mask poor performance on specific document types or fields"
- "Stratified random sampling for measuring error rates in high-confidence extractions and detecting novel error patterns"
- "Field-level confidence scores calibrated using labeled validation sets for routing review attention"
- "The importance of validating accuracy by document type and field segment before automating high-confidence extractions"
- "Routing extractions with low model confidence or ambiguous/contradictory source documents to human review, prioritizing limited reviewer capacity"

**Advertencia:** la doc oficial de producto NO habla de "confidence scores por campo" ni de "stratified sampling" con esas palabras. Abajo están las frases que sí existen y que respaldan cada idea por analogía directa. Las preguntas usan como respuesta correcta solo lo que estas frases sostienen.

## Content moderation (use case guide) — niveles de riesgo y revisión humana

- "Creating multiple risk levels allows you to adjust the aggressiveness of your moderation. For example, you might want to automatically block user queries that are deemed high risk, whereas users with many medium risk queries are flagged for human review."
- Prompt del ejemplo: "Assign a risk level based on your confidence that the user's message should be moderated"
- "It can be seamlessly integrated into a larger system to automate content filtering or flag comments for human review based on their assessed risk level."
- Producción: "Continuously evaluate and improve: Regularly assess the performance of your content moderation system using metrics such as precision and recall tracking."
- "Ensure that you include edge cases and challenging scenarios that might be difficult for a content moderation system to handle effectively."

## Ticket routing (use case guide) — precisión por segmento

- "Measure the routing accuracy across different languages, aiming for no more than a 5–10 percent drop in accuracy for non-primary languages."
- "Create a test set of edge cases and measure the routing accuracy, aiming for at least 80 percent accuracy on these challenging inputs."
- "Regularly audit routing decisions for potential biases, aiming for consistent routing accuracy (within 2–3 percent) across all customer groups."
- "Traditional ML systems often struggle with outliers and ambiguous inputs, frequently misclassifying them or defaulting to a catch-all category."

## Legal summarization / customer support

- "legal experts can also evaluate the quality of the generated summaries. Although this is expensive and time-consuming at scale, this is often done on a few summaries as a validation check before deploying to production."
- Escalation: "Track the percentage of correctly escalated conversations versus those that should have been escalated but weren’t."

## Develop tests (evals)

- "Design evals that mirror your real-world task distribution. Don’t forget to factor in edge cases!"
- Edge case: "Ambiguous test cases where even humans would find it hard to reach an assessment consensus"
- "Human grading: Most flexible and high quality, but slow and expensive. Avoid if possible."
- Ejemplo de criterio: F1 "on a held-out test set of 10,000 diverse Twitter posts".

## Demystifying evals for AI agents (engineering)

- Human graders, métodos: "SME review", "Spot-check sampling", "Inter-annotator agreement"; fortalezas: "Used to calibrate model-based graders".
- Model-based graders, debilidad: "Requires calibration with human graders for accuracy".
- "LLM-as-judge graders should be closely calibrated with human experts to gain confidence that there is little divergence between the human grading and model grading."
- "To avoid hallucinations, give the LLM a way out, like providing an instruction to return “Unknown” when it doesn’t have enough information."
- "Once the system is robust, it’s sufficient to use human review only occasionally."
- "Production monitoring kicks in post-launch to detect distribution drift and unanticipated real-world failures."
- "triage feedback constantly, sample transcripts to read weekly, and dig deeper as needed."
- "The most effective teams combine these methods: automated evals for fast iteration, production monitoring for ground truth, and periodic human review for calibration."

## Structured outputs / citations / reduce hallucinations

- "Structured outputs guarantee schema-compliant responses through constrained decoding" (garantiza formato, no que el valor sea correcto).
- Union types: "for example, `\"type\": [\"string\", \"null\"]`" (límite: 16 parámetros con union types entre todos los schemas strict de un request).
- Citations: "Check that each field has a value and at least one citation. The API doesn’t guarantee either."
- Reduce hallucinations: "Explicitly give Claude permission to admit uncertainty." · "Always validate critical information, especially for high-stakes decisions."

## Lo que no pude respaldar con doc de producto

- "Stratified random sampling" como término: no aparece. Se usa "spot-check sampling" / "periodic human review" del post de evals.
- "Field-level confidence scores calibrated with labeled validation sets": no aparece literal. Se apoya en "calibrated with human experts" (post de evals) + held-out test set (develop-tests). En la lección queda marcado como concepto de la guía.
- Que el modelo produzca un número de confianza bien calibrado por sí solo: la doc NO lo afirma. No se usa como respuesta correcta.
