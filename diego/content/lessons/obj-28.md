---
objective: 28
title: "JSON cortado a la mitad: cuándo subir max_tokens y cuándo partir la tarea"
rule: "JSON truncado (stop_reason max_tokens): primero subí max_tokens, como dice la doc; si el output crece con el tamaño del input o toca el techo del modelo, partilo en llamadas chicas (por archivo o módulo) con el mismo schema y uní los resultados en código."
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
    title: "Stop reasons and fallback"
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs (Invalid outputs)"
  - url: https://platform.claude.com/docs/en/about-claude/models/overview
    title: "Models overview (Max output)"
  - url: https://platform.claude.com/docs/en/build-with-claude/thinking
    title: "Thinking (cuenta para max_tokens)"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
    title: "Increase output consistency (Chain prompts)"
status: verificada
---

## Qué es (repaso)

Mandás un PR de 80 archivos en una sola llamada y pedís los hallazgos como JSON. Vuelve `stop_reason: "max_tokens"` y el JSON está cortado: no parsea. La doc de structured outputs lo dice: "The output might be incomplete and not match your schema."

Hay dos caminos y el examen quiere que sepas cuándo va cada uno:

| Situación | Fix |
|---|---|
| Te quedaste un poco corto (pusiste 1024 y la respuesta pedía 3000) | Subir `max_tokens`. La doc lo recomienda como primer remedio |
| El output **crece con el input** (más archivos → más hallazgos) o ya estás cerca del techo del modelo | **Partir**: una llamada por archivo o módulo, mismo schema, merge en código |

¿Por qué no subir siempre? Porque hay un techo: Claude Opus 5.5 tiene **128K** tokens de salida máxima en la Messages API sincrónica. Y el thinking **también cuenta** para `max_tokens`: "they count toward `max_tokens` alongside the response text". El PR del mes que viene va a ser más grande; subir es correr atrás del problema.

Partir tiene más ventajas prácticas: podés reintentar solo la llamada que falló y correrlas en paralelo. La doc: "Break down complex tasks into smaller, consistent subtasks."

## El error típico que el examen quiere que cometas

- **"Subí `max_tokens` a 300000"** → en la Messages API sincrónica el máximo de Opus 5.5 es 128K. (300K existe solo en Message Batches con un beta header, y tampoco escala para siempre.)
- **"Pedile que sea más breve"** → recorta descripciones o hallazgos; no arregla que el output crezca con el input.
- **Parsear el JSON cortado "como se pueda"** → perdés hallazgos sin saber cuáles.
- **No mirar `stop_reason`** → tratás un JSON truncado como si fuera un error de parseo cualquiera.

## Ejemplo

```python
hallazgos = []
for archivo in archivos_del_pr:            # una llamada chica por archivo
    r = client.messages.create(model="claude-opus-5-5", max_tokens=8000,
        messages=[{"role": "user", "content": prompt_review(archivo)}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}})
    if r.stop_reason == "max_tokens":
        reintentar(archivo)               # primero con más max_tokens; si toca el techo, partir más fino
        continue
    hallazgos += json.loads(texto(r))["hallazgos"]
reporte = dedupe_y_ordenar(hallazgos)      # merge en código
```

## Para recordar

- `stop_reason: "max_tokens"` + JSON roto = truncamiento.
- Un poco corto → subí `max_tokens`. Crece con el input / cerca del techo → partí.
- Mismo schema en cada pedazo → merge, dedupe y orden en tu código.
- El thinking come `max_tokens`: dejá margen.
