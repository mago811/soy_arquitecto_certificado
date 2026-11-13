---
objective: 20
title: "Explorar un repo grande sin que Claude se pierda"
rule: "Salida ruidosa → subagente que devuelve resumen; hallazgos que tienen que durar → archivo de notas; misma tarea con menos ruido → /compact con foco; tarea nueva → /clear."
sources:
  - url: https://code.claude.com/docs/en/context-window
    title: "Explore the context window"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
  - url: https://code.claude.com/docs/en/costs
    title: "Manage costs effectively"
  - url: https://code.claude.com/docs/en/commands
    title: "Commands"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    title: "Effective context engineering for AI agents"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "Guía oficial del examen (Task Statement 5.4)"
status: no_verificado
---

## Qué es

En una exploración larga pasa algo concreto: al principio Claude nombra clases reales (`RefundSaga`), y horas después habla de "lo típico en estos sistemas". El examen lo llama **degradación de contexto**. Tiene cuatro antídotos.

| Herramienta | Qué hace | Qué NO hace |
|---|---|---|
| **Subagente** (ej. Explore) | Explora en su propia ventana; a tu conversación vuelve solo el resumen | No ve tu conversación: hay que pasarle lo que ya sabés |
| **Archivo de notas** (`NOTES.md`, `progress.txt`) | Persiste hallazgos fuera de la ventana; Claude los relee | No se carga solo: hay que pedir que lo consulte (o ponerlo en CLAUDE.md) |
| **`/compact [instrucciones]`** | Resume la conversación y libera espacio; vos elegís el foco | No es gratis: lee toda la conversación para resumirla |
| **`/clear [nombre]`** | Conversación nueva y vacía; la anterior queda para `/resume` | No conserva nada de la conversación |

Y una regla de fondo: **las sesiones son independientes**. Cada una arranca con ventana fresca.

## Cuándo se usa

- **Búsqueda amplia, muchos archivos, salida que no vas a mirar de nuevo** → subagente. La doc: "the verbose output stays in the subagent's context while only the relevant summary returns".
- **Varios subagentes en paralelo** → pediles **resúmenes cortos**. Sus resultados vuelven a tu conversación; si cada uno trae un informe de 5 páginas, perdiste el aislamiento.
- **Fase 2 que depende de la fase 1** → el subagente (que no sea fork) "doesn't see your conversation history". Resumí los hallazgos y metelos en el mensaje de delegación.
- **Querés retomar un subagente** → `general-purpose` o uno custom. Explore y Plan son one-shot: no devuelven agent ID.
- **Subagente que debería aprender del repo** → `memory: project` en su frontmatter (directorio persistente versionable).
- **Misma tarea, contexto lleno de ruido** → `/compact focus on ...`.
- **Tarea sin relación** → `/clear pagos` y después `/resume` si querés volver.
- **Instrucción que tiene que sobrevivir a la compactación** → `CLAUDE.md` de la raíz. Se relee del disco después de compactar. Lo dicho en el chat se resume y se puede perder.
- **Trabajo de varios días** → estado en archivos: JSON para lo estructurado, notas libres para el progreso, git como log. La sesión nueva arranca leyéndolos.

## El error típico que el examen quiere que cometas

- **"Leé todo de nuevo para estar seguro"**: lo opuesto a lectura dirigida.
- **"Pasá a un modelo con más ventana"**: no evita la degradación.
- **"Decile 'acordate de lo de la fase 1'"** a un subagente: nunca la vio.
- **Confundir `/compact` y `/clear`**: compact = seguir con menos ruido; clear = empezar otra cosa.
- **Regla con `paths:` para algo que tiene que sobrevivir**: las reglas con `paths` se cargan en el historial y la compactación las resume. Solo vuelven cuando se toca un archivo que matchea.
- Matiz de la doc actual: con ventanas de 1M, "quedarse sin contexto" es raro. Los subagentes siguen sirviendo para **sacar salida ruidosa de tu conversación**, paralelismo y revisión independiente, pero cada uno cuesta tokens.

## Ejemplo

Diego mapea un monolito:

```text
> Usá un subagente para encontrar todos los lugares donde se valida un CUIT.
  Devolveme solo archivo:línea y una frase por hallazgo.
> Anotá en NOTES.md lo que encontró, con rutas exactas.
> /compact keep NOTES.md findings and the refund flow
```

Al día siguiente, sesión nueva: "Leé NOTES.md y el git log antes de seguir".

## Para recordar

- Subagente = ventana propia, vuelve resumen. No ve tu historial.
- Notas en archivo = memoria que sobrevive a compactación y a sesiones.
- `/compact <foco>` seguir; `/clear [nombre]` cambiar de tarea; `/context` mirar qué ocupa.
- `CLAUDE.md` de la raíz sobrevive a la compactación; el chat no.
