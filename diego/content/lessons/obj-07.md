---
objective: 7
title: "Descomposición dinámica: el plan cambia cuando aparece información nueva"
rule: "Tarea predecible → cadena fija de pasos (con gates); tarea abierta → plan que se rehace con cada hallazgo intermedio."
sources:
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://www.anthropic.com/engineering/building-effective-agents
    title: "Building effective agents"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "CCAR-F Exam Guide (Task Statement 1.6)"
status: verificada
---

## Qué es

Hay dos formas de partir una tarea grande:

| Patrón | Cómo se arma | Sirve cuando… | Riesgo si lo usás mal |
|---|---|---|---|
| **Cadena fija** (prompt chaining) | Pasos definidos en el código; cada llamada procesa la salida de la anterior, con "gates" en el medio | La tarea "can be easily and cleanly decomposed into fixed subtasks" | Sigue de largo aunque el paso 1 ya cambió todo |
| **Descomposición dinámica** (orchestrator-workers, agente) | Un LLM decide los subtasks según lo que va encontrando | "you can’t predict the subtasks needed" | Inconsistencia en tareas que eran predecibles |

La frase clave del post de Anthropic: la investigación es "inherently dynamic and path-dependent". El agente toma decisiones "based on intermediate findings". Un pipeline lineal no puede.

## Cuándo se usa

- **Investigación abierta, debugging, "agregá tests a un legacy"** → dinámica. Primero mapear la estructura, después identificar lo de mayor impacto, después un plan priorizado **que se ajusta** cuando descubrís dependencias.
- **Review predecible con varios aspectos, extracción con pasos conocidos** → cadena fija. La doc de prompting: el chaining explícito sirve "when you need to inspect intermediate outputs or enforce a specific pipeline structure".
- **Review grande de código** → partir en pasadas: una por archivo (el post lo llama *sectioning*: "each consideration is handled by a separate LLM call") + una pasada aparte de integración entre archivos. Cada llamada tiene foco; no se diluye la atención.

En el sistema de Research de Anthropic, el lead agent arma un plan, lanza subagentes, junta resultados y "decides whether more research is needed—if so, it can create additional subagents or refine its strategy". Eso es dinámico: los subtasks de la ronda 2 no existían en la ronda 1.

## El error típico que el examen quiere que cometas

- **Plan escrito al principio y ejecutado a ciegas.** El agente encuentra en el paso 1 la causa raíz (o una dependencia que cambia el orden) y sigue con los pasos 2, 3 y 4 como si nada. El fix NO es "más pasos" ni "un modelo más grande": es que cada resultado pueda cambiar el plan.
- **Lo contrario: dinámico donde había que ser fijo.** Un flujo de facturas siempre es extraer → validar → formatear. Un orquestador "creativo" a veces saltea la validación. Ahí va cadena con gates.
- **Recorrer en orden fijo (alfabético, por carpeta)** en vez de priorizar por impacto.
- **Confundir "dinámico" con "sin plan".** Hay plan; lo que cambia es que se reescribe. La doc sugiere "Update a hypothesis tree or research notes file".

## Ejemplo

Pedido: "Agregá tests al monolito de 2015".

Mal (fijo): "Para cada archivo de `src/` en orden alfabético, escribí tests". Gasta el presupuesto en `aaa-utils.js` y nunca llega a `pagos/`.

Bien (dinámico):

```text
1. Mapeá la estructura (Glob/Grep) y anotá los módulos en PLAN.md.
2. Rankeá por impacto (pagos, auth, lo más importado).
3. Empezá por el primero. Si descubrís una dependencia que bloquea
   (ej. un singleton sin inyección), actualizá PLAN.md y reordená
   antes de seguir.
```

## Para recordar

- Predecible → cadena fija con gates. Abierto → plan que se adapta.
- "Dinámico" = los subtasks salen de los hallazgos, no de una lista escrita antes.
- Review grande → por archivo + pasada de integración.
- Si el paso 1 encontró la respuesta, el plan tiene que poder cambiar.
