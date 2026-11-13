---
objective: 10
title: "Coordinador, paralelo o secuencial: elegir según cobertura, latencia y confiabilidad"
rule: "Independientes → en paralelo; con dependencias → en secuencia; abierto y amplio → coordinador que reparte sin solapar; simple → un solo agente."
sources:
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://www.anthropic.com/engineering/building-effective-agents
    title: "Building effective agents"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (Task Statement 1.2)"
status: no_verificado
---

## Qué es

Tres estructuras para que varios agentes trabajen juntos:

| Patrón | Cómo funciona | Gana en… | Pierde en… |
|---|---|---|---|
| **Coordinador-worker** (hub-and-spoke) | Un lead agent descompone, delega, junta y decide si falta algo | Cobertura en temas abiertos; control de errores en un solo lugar | Tokens: multi-agente usa "about 15× more tokens than chats" |
| **Paralelo** | Subtareas independientes al mismo tiempo | Latencia: terminan "in the time of the slowest one rather than the sum of all of them" | Solo si NO dependen una de otra |
| **Secuencial** (pipeline / chain) | La salida de A es la entrada de B | Confiabilidad y control de cada paso | Latencia: suma los tiempos |

En la práctica se combinan: el Research de Anthropic es un coordinador que lanza "3-5 subagents in parallel rather than serially".

## Cuándo se usa

- **Cobertura** (tema amplio): coordinador que **parte el alcance en pedazos distintos**. Cada subagente necesita "an objective, an output format, guidance on the tools and sources to use, and clear task boundaries". Sin eso: "agents duplicate work, leave gaps".
- **Latencia** (subtareas independientes): paralelo. En Claude Code / SDK, el coordinador emite varias llamadas a la tool `Agent` en la misma respuesta.
- **Dependencias** (extraer → verificar → redactar): secuencial. La doc de sub-agents: el paralelo "works best when the research paths don't depend on each other".
- **Confiabilidad / observabilidad**: que todo pase por el coordinador. Ahí se manejan errores de forma consistente y se ve el flujo. Los subagentes no ven el historial del coordinador: hay que pasarles el contexto en el prompt.
- **Pregunta simple**: un agente. "Simple fact-finding requires just 1 agent with 3-10 tool calls". Y si las tareas comparten mucho estado (mucho código interdependiente), el post dice que no son buen caso para multi-agente.

## El error típico que el examen quiere que cometas

- **Cobertura incompleta y culpar al subagente equivocado.** Si el reporte sale sin la mitad del tema y los subagentes hicieron bien lo que les tocó, el problema es la **descomposición del coordinador** (demasiado angosta), no el buscador ni el sintetizador.
- **Paralelizar pasos dependientes** "para ganar velocidad": el paso B corre sin la entrada de A.
- **Serializar lo independiente**: 4 subtemas uno detrás del otro = 4 veces la latencia.
- **Subagentes hablando entre ellos directo**: se pierde control de errores y trazabilidad.
- **Multi-agente para todo**: 10 subagentes para buscar un dato. Más tokens, más latencia, nada de calidad extra.

## Ejemplo

Consultora: "panorama de energías renovables en LATAM". Tres requisitos: cubrir todo, responder en minutos, no inventar.

- Coordinador que parte por **tecnología** (solar, eólica, hidro, biomasa) y por **tipo de fuente** (regulación, mercado) sin solapar → cobertura.
- Esos 4 subagentes corren **en paralelo** → latencia.
- Después, **en secuencia**: verificación de cifras sobre lo que trajeron → síntesis. El coordinador mira el resultado y, si hay huecos, lanza otra ronda → confiabilidad.

## Para recordar

- Independiente → paralelo. Dependiente → secuencial. Abierto/amplio → coordinador.
- Huecos en el reporte con subagentes "bien" → la culpa es de cómo partió el coordinador.
- Todo pasa por el coordinador: errores, contexto, decisiones.
- Escalá el esfuerzo a la pregunta: lo simple, con un agente.
