---
objective: 4
title: "Delegar por objetivo, no por pasos (sin perder el control)"
rule: "Al subagente le das objetivo + criterios de calidad + formato de salida + límites; los pasos los decide él. El control lo mantenés con el formato de reporte, los presupuestos y los límites que aplica el SDK."
sources:
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (PDF linkeado desde esta página), Task Statement 1.3"
status: no_verificado
---

## Qué es

Cuando un coordinador le pasa trabajo a un subagente, lo puede hacer de dos maneras:

- **Por pasos (procedural):** "1) buscá X en Google, 2) abrí los 3 primeros, 3) copiá el párrafo con la cifra…".
- **Por objetivo (goal-oriented):** "Necesito la participación de mercado de X en 2025 con al menos dos fuentes primarias. Devolvé una tabla con cifra, fuente y fecha. No cubras el mercado asiático, eso lo hace otro agente."

La guía del examen lo dice explícito: el coordinador especifica **objetivos y criterios de calidad**, no instrucciones paso a paso, para que el subagente se pueda **adaptar**. Anthropic lo aprendió construyendo su sistema de research: cada subagente necesita "an objective, an output format, guidance on the tools and sources to use, and clear task boundaries".

Ojo: "por objetivo" **no** es "vago". El post cuenta que al principio el lead agent mandaba cosas como "research the semiconductor shortage" y los subagentes repetían las mismas búsquedas.

| Delegación | Qué pasa cuando aparece algo inesperado | Riesgo |
|---|---|---|
| Por pasos rígidos | Sigue el guion aunque el hallazgo cambie todo | No se adapta, se pierde lo importante |
| Vaga ("investigá X") | Improvisa, sin límites | Duplica trabajo, deja huecos |
| **Objetivo + criterios + formato + límites** | Cambia de camino, pero entrega lo que se pidió | El punto justo |

## Cuándo se usa

- **Investigación abierta** (research, auditoría de código, "¿por qué falla esto?"): por objetivo. No sabés de antemano qué vas a encontrar.
- **Pipeline fijo donde el orden importa** y querés inspeccionar cada salida: ahí sí van pasos o prompt chaining. La doc: el chaining sirve "when you need to inspect intermediate outputs or enforce a specific pipeline structure".

¿Y la visibilidad del coordinador? No la ganás dictando pasos. La ganás con:

1. **Formato de salida obligatorio**: qué fuentes consultó, qué cubrió, qué huecos quedaron.
2. **Presupuestos de esfuerzo** en el prompt (Anthropic: 1 agente y 3–10 tool calls para algo simple; 2–4 subagentes para comparaciones; 10+ para research complejo).
3. **Límites que el SDK aplica**: `maxTurns` en el `AgentDefinition`, `max_budget_usd`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `tools` restringidas. La doc lo dice claro: las instrucciones "only steer Claude, so set the limits as well".
4. **Todo vuelve al coordinador**: cada subagente devuelve su resultado y el coordinador decide el próximo paso.

## El error típico que el examen quiere que cometas

Te muestran un subagente que "no encontró lo obvio" o que se fue por las ramas. Las opciones trampa:

- "Darle una lista de 15 pasos exactos": mata la adaptación. Si el dato está en otro lado, no lo va a buscar.
- "Dejar que los subagentes hablen entre ellos sin pasar por el coordinador": perdés visibilidad y control.
- "Evaluar si siguió el proceso prescripto": Anthropic recomienda evaluar el **estado final**, porque hay caminos distintos y válidos.

Y la trampa inversa: si el problema es que tres subagentes hicieron **la misma búsqueda**, el fix no es "más libertad". Es darle a cada uno un objetivo distinto y límites claros.

## Ejemplo

Auditoría de seguridad. Prompt procedural (roto):

```text
1. Corré grep "eval(" en src/
2. Leé cada match
3. Reportá los que reciben input del usuario
```

La vulnerabilidad real está en `templates/` y usa `new Function(`. El subagente nunca la ve.

Prompt por objetivo (arreglado):

```text
Objetivo: encontrar ejecución dinámica de código alimentada por input del usuario.
Alcance: src/ y templates/. No toques tests/ (lo revisa otro agente).
Criterio de "hallazgo": hay un camino desde un request HTTP hasta la ejecución.
Presupuesto: hasta ~20 tool calls.
Salida: lista con archivo:línea, camino del dato, severidad (alta/media/baja),
y una sección "no revisado" con lo que no llegaste a cubrir.
```

## Para recordar

- Objetivo + criterios de calidad + formato de salida + límites. Los pasos los elige el subagente.
- Vago ≠ por objetivo. Vago produce duplicados y huecos.
- Visibilidad = formato de reporte + todo vuelve al coordinador + tracing. Control = límites que aplica el SDK (`maxTurns`, presupuesto, `tools`).
- Pasos explícitos solo cuando el orden importa o necesitás inspeccionar cada salida intermedia.
- Evaluá el resultado final, no si siguió "tu" camino.
