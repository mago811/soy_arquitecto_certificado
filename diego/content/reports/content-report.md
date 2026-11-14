# Reporte de contenido

Generado: 2026-11-14

**Totales:** 508 preguntas generadas · 505 verificadas (77 con corrección) · 3 descartadas · 0 sin verificar.

Pool práctica verificada: 325 · pool simulacros verificada: 180

| # | Dominio | Base | Generadas | Verificadas | Corregidas | Descartadas | Sin verificar | Lección | Lab |
|---|---|---|---|---|---|---|---|---|---|
| 1 | d1 | 0% | 16 | 16 | 1 | 0 | 0 | verificada | verificada |
| 2 | d1 | 100% | 12 | 12 | 5 | 0 | 0 | verificada | verificada |
| 3 | d1 | 67% | 14 | 14 | 0 | 0 | 0 | verificada | verificada |
| 4 | d1 | 50% | 16 | 16 | 1 | 0 | 0 | verificada | verificada |
| 5 | d1 | 100% | 12 | 12 | 3 | 0 | 0 | verificada | verificada |
| 6 | d1 | 0% | 16 | 15 | 1 | 1 | 0 | verificada | verificada |
| 7 | d1 | 100% | 12 | 12 | 1 | 0 | 0 | verificada | verificada |
| 8 | d2 | 0% | 16 | 16 | 3 | 0 | 0 | verificada | verificada |
| 9 | d5 | 0% | 15 | 15 | 1 | 0 | 0 | verificada | verificada |
| 10 | d1 | 100% | 12 | 12 | 4 | 0 | 0 | verificada | verificada |
| 11 | d2 | 0% | 15 | 15 | 5 | 0 | 0 | verificada | verificada |
| 12 | d2 | 0% | 15 | 15 | 1 | 0 | 0 | verificada | verificada |
| 13 | d2 | 0% | 15 | 15 | 2 | 0 | 0 | verificada | verificada |
| 14 | d2 | 0% | 15 | 15 | 4 | 0 | 0 | verificada | verificada |
| 15 | d2 | 100% | 11 | 11 | 2 | 0 | 0 | verificada | verificada |
| 16 | d2 | 0% | 15 | 15 | 1 | 0 | 0 | verificada | verificada |
| 17 | d4 | 40% | 13 | 13 | 4 | 0 | 0 | verificada | verificada |
| 18 | d5 | 0% | 15 | 15 | 1 | 0 | 0 | verificada | verificada |
| 19 | d5 | 0% | 15 | 15 | 1 | 0 | 0 | verificada | verificada |
| 20 | d5 | 0% | 14 | 14 | 2 | 0 | 0 | verificada | verificada |
| 21 | d5 | 0% | 14 | 14 | 3 | 0 | 0 | verificada | verificada |
| 22 | d5 | 0% | 15 | 14 | 3 | 1 | 0 | verificada | verificada |
| 23 | d3 | 50% | 12 | 12 | 0 | 0 | 0 | verificada | verificada |
| 24 | d3 | 0% | 15 | 14 | 1 | 1 | 0 | verificada | verificada |
| 25 | d3 | 0% | 14 | 14 | 0 | 0 | 0 | verificada | verificada |
| 26 | d3 | 33% | 14 | 14 | 5 | 0 | 0 | verificada | verificada |
| 27 | d3 | 0% | 14 | 14 | 4 | 0 | 0 | verificada | verificada |
| 28 | d3 | 100% | 10 | 10 | 2 | 0 | 0 | verificada | verificada |
| 29 | d3 | 100% | 10 | 10 | 3 | 0 | 0 | verificada | verificada |
| 30 | d3 | 0% | 14 | 14 | 3 | 0 | 0 | verificada | verificada |
| 31 | d3 | 100% | 10 | 10 | 2 | 0 | 0 | verificada | verificada |
| 32 | d4 | 50% | 12 | 12 | 2 | 0 | 0 | verificada | verificada |
| 33 | d4 | 0% | 15 | 15 | 2 | 0 | 0 | verificada | verificada |
| 34 | d4 | 0% | 15 | 15 | 1 | 0 | 0 | verificada | verificada |
| 35 | d4 | 0% | 15 | 15 | 0 | 0 | 0 | verificada | verificada |
| 36 | d4 | 100% | 10 | 10 | 2 | 0 | 0 | verificada | verificada |
| 37 | d4 | 0% | 15 | 15 | 1 | 0 | 0 | verificada | verificada |

## Simulacros

- Simulacro 1: 60 preguntas · d1 16 · d2 12 · d3 12 · d4 11 · d5 9
- Simulacro 2: 60 preguntas · d1 16 · d2 12 · d3 12 · d4 11 · d5 9
- Simulacro 3: 60 preguntas · d1 16 · d2 12 · d3 12 · d4 11 · d5 9

## Descartadas

- **o06-q01**: Premisa falsa según agent-sdk/permissions: en dontAsk 'Calls that need no approval in default mode also run as normal, such as ... calls to Agent'. Agent no necesita estar en allowed_tools; la respuesta marcada no es el fix.
- **o22-s04**: Casi igual a o22-q02 (precisión global alta esconde un segmento malo → medir por segmento y dejar revisión ahí; acá el segmento es el idioma). Además la cita de ticket-routing solo habla de medir accuracy de ruteo de tickets por idioma; 'mandar ese idioma a revisión humana' no está en la doc. Reemplazar por un escenario nuevo.
- **o24-s02**: No mide el objetivo 24 (separar seguridad/negocio/API en pasadas con few-shot propio): mide revisor independiente vs autorrevisión (/code-review en subagente nuevo), que no está en la currícula como objetivo. Reescribirlo hacia pasadas separadas repetiría o24-q01. Cita y datos correctos (best-practices), pero fuera de objetivo.
