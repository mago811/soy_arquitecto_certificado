---
objective: 3
title: "El subagente solo sabe lo que le pasás en el prompt"
rule: "Un subagente (que no sea fork) NO hereda la conversación del coordinador: todo hallazgo, dato, decisión y metadato de fuente que necesite tiene que ir escrito en el prompt de delegación."
sources:
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (PDF linkeado desde esta página), Task Statement 1.3"
status: no_verificado
---

## Qué es

Un subagente arranca con un **contexto nuevo y aislado**. La doc del Agent SDK lo dice sin vueltas: "The only content you pass from parent to subagent is the Agent tool's prompt string, so include any file paths, error messages, or decisions the subagent needs directly in that prompt."

| El subagente recibe | El subagente NO recibe |
|---|---|
| Su system prompt (`AgentDefinition.prompt` o el cuerpo del `.md`) | La conversación del coordinador |
| El prompt de delegación (input `prompt` de la tool `Agent`) | Los resultados de tools del coordinador (archivos leídos, búsquedas) |
| El CLAUDE.md del proyecto (salvo `omitClaudeMd`) | El system prompt del coordinador |
| Sus tools | Skills ya invocadas (salvo las de su campo `skills`) |

La excepción es un **fork**: hereda toda la conversación. Se usa "when any other subagent would need too much background to be useful".

## Cuándo se usa

Siempre que delegás. Un buen prompt de delegación tiene:

1. **Los hallazgos completos** de los agentes anteriores, no "ver arriba".
2. **Datos estructurados** (cifras, IDs, rutas de archivo, mensajes de error).
3. **Metadatos de fuente separados del contenido**: URL, nombre del documento, página, fecha. La doc de prompting recomienda envolver cada documento en `<document>` con `<source>` y `<document_content>`.
4. **Decisiones y restricciones** que tomó el usuario ("no toques `vendor/`"). La doc de Claude Code: si una regla tiene que llegar al subagente, "restate it in the prompt you give Claude when delegating".
5. **Objetivo y formato de salida** (ver objetivo 4).

La prueba de la doc: mostrale el prompt a un colega sin contexto. Si se confunde, Claude también.

## El error típico que el examen quiere que cometas

Escenario: el subagente de síntesis devuelve un texto genérico sin cifras, o pregunta "¿qué fuentes uso?". Opciones trampa:

- "Darle más `maxTurns`" o "cambiar a un modelo más grande": no le falta capacidad, le falta **información**.
- "Escribir en su `description` que use los resultados anteriores": la `description` solo sirve para que Claude decida cuándo delegar. No transporta datos.
- "Activar memoria compartida entre subagentes": no existe tal cosa. Los subagentes no comparten memoria entre invocaciones.

El fix es casi siempre el mismo: **meter los hallazgos y sus metadatos en el prompt de delegación**.

Segundo error: pasar un resumen en prosa sin las URLs ("encontramos que el mercado creció 12%"). La síntesis ya no puede citar. Pasá los datos con su fuente pegada.

## Ejemplo

Pipeline de research. El coordinador ya tiene resultados del buscador web y del analizador de PDFs. Prompt roto para el sintetizador:

```text
Sintetizá los hallazgos de los otros agentes en un informe.
```

Prompt arreglado:

```xml
<documents>
  <document index="1">
    <source>https://ejemplo.org/informe-2025 · publicado 2025-03-10</source>
    <document_content>"La capacidad instalada creció 12% interanual..."</document_content>
  </document>
  <document index="2">
    <source>reporte_anual.pdf · pág. 14 · 2024</source>
    <document_content>"...crecimiento del 9% en el mismo período..."</document_content>
  </document>
</documents>

Objetivo: informe de 1 página sobre capacidad instalada 2024-2025.
Las cifras de los documentos 1 y 2 no coinciden: mostrá las dos con su fuente,
no elijas una. Cada afirmación lleva el índice del documento que la respalda.
Restricción del usuario: nada de proyecciones a 2030.
```

Los documentos largos van arriba y la consulta al final: la doc de long context dice que eso mejora la calidad.

## Para recordar

- Subagente no-fork = contexto en blanco + su system prompt + tu prompt de delegación.
- Lo que no está en el prompt, no existe para él (archivos leídos, decisiones, reglas dichas en el chat).
- Hallazgos completos + datos estructurados + metadatos de fuente (URL, documento, página, fecha).
- `description` = cuándo delegar. `prompt` de la tool `Agent` = qué hacer y con qué datos.
- ¿Necesita TODO el contexto? Fork. Si no, prompt completo.
