---
objective: 22
title: "Revisión humana dirigida: mandá al humano lo dudoso, no una muestra al azar"
rule: "Revisión humana por riesgo y ambigüedad (confianza baja, campo vacío o sin cita, documento contradictorio), con umbrales medidos por segmento; muestreo al azar solo para vigilar lo automatizado."
sources:
  - url: https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation
    title: "Content moderation"
  - url: https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing
    title: "Ticket routing"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
    title: "Define success and build evaluations"
  - url: https://platform.claude.com/docs/en/build-with-claude/citations
    title: "Citations"
  - url: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
    title: "Demystifying evals for AI agents"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "Claude Certified Architect – Foundations (guía del examen, TS 5.5)"
status: no_verificado
---

## Qué es

Un pipeline extrae datos de miles de documentos (facturas, contratos). Tenés pocos revisores. La pregunta del examen: **¿qué ve el humano?**

- Malo: una muestra al azar del 5%. Los revisores ven sobre todo documentos fáciles, y los difíciles pasan sin que nadie los mire.
- Bueno: **ruteo**. Lo de baja confianza, lo ambiguo y lo contradictorio va a revisión. Lo de alta confianza (y medido) pasa solo.

La guía de content moderation de Anthropic lo muestra con niveles de riesgo: lo de riesgo alto se bloquea solo y lo de riesgo medio "flagged for human review". El prompt del ejemplo le pide al modelo: "Assign a risk level based on your confidence".

## Cuándo se usa

| Señal | Qué hacer |
|---|---|
| Confianza baja o nivel de riesgo medio | Cola de revisión humana, ordenada por riesgo (no FIFO) |
| Campo que el documento no trae | Schema con el campo nullable (`"type": ["string", "null"]`) y permiso para devolver `null`; el `null` en un campo crítico va a revisión |
| Campo sin cita (Citations) | La doc avisa: "Check that each field has a value and at least one citation. The API doesn’t guarantee either." Sin cita → revisión |
| Documento con datos contradictorios | Extraer ambos valores, marcar el conflicto, mandar a humano |
| "97% de precisión general" | Medir **por tipo de documento y por campo** antes de sacar revisión |
| Ya automatizaste lo de alta confianza | Seguir revisando de vez en cuando una muestra de eso para detectar errores nuevos |

<!-- no verificado: "confidence scores por campo calibrados con un set etiquetado" y "stratified random sampling" son términos de la guía del examen (TS 5.5); la doc de producto no los usa con esas palabras. Se apoyan en: calibrar contra jueces humanos (post de evals) y medir sobre un test set etiquetado (develop-tests). -->

## El error típico que el examen quiere que cometas

1. **"Subí el muestreo aleatorio del 5% al 15%".** Más horas de revisión, mismo problema: no apunta a lo dudoso.
2. **"97% general, ya podemos sacar la revisión".** Un promedio esconde segmentos malos. La guía de ticket routing mide precisión por idioma y por grupo de clientes, con tolerancias de caída explícitas.
3. **"Usamos structured outputs, así que los datos están bien".** Structured outputs garantiza que el JSON cumpla el schema. No garantiza que el valor sea el correcto.
4. **"El modelo da confianza 0–100; pongamos el umbral en 80".** Un número inventado a ojo. El umbral se elige comparando contra datos etiquetados por humanos. El post de evals lo dice para los jueces LLM: "Requires calibration with human graders for accuracy".
5. **"Cuando dos páginas no coinciden, que elija la más plausible".** Eso esconde la ambigüedad. Ambiguo = humano.
6. **"Una vez automatizado, nadie más lo mira".** Cambia un formato de proveedor y el error pasa meses sin verse. El post de evals: "Production monitoring kicks in post-launch to detect distribution drift".

## Ejemplo

Extracción de facturas. El schema devuelve por campo `valor` (nullable), `confianza` y `motivo`. La regla de ruteo en tu código:

```text
si algún campo crítico es null, o tiene confianza < umbral_del_campo, o hay conflicto → cola humana (ordenada por riesgo)
si no → auto-aprobado, y un % de los auto-aprobados va a spot-check
```

`umbral_del_campo` no sale de la intuición: lo sacás de 200 facturas etiquetadas, mirando con qué confianza el modelo se equivoca en cada campo y tipo de documento (PDF digital vs. escaneada).

## Para recordar

- Ruteo por **riesgo/confianza + ambigüedad + contradicción**, no por azar.
- Medí **por segmento** (tipo de documento, campo, idioma) antes de automatizar.
- Umbrales **calibrados contra datos etiquetados por humanos**.
- `null` permitido + "devolvé null si no está" = la duda se ve y se puede rutear.
- Lo automatizado se sigue vigilando con muestras periódicas.
