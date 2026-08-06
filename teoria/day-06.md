---
dia: 6
titulo: Extraction accuracy + consolidado de rojas
duracion: 3h
---

## 📱 Pregunta de apertura · 5 min

**Un extractor de denuncias de siniestros ya tiene el schema del día 5: nullable, enums, descriptions. Aun así, cuando la denuncia no trae número de póliza, el modelo lo inventa; y las fechas salen a veces 12/05/2026 y a veces 2026-05-12. El prompt tiene cuatro ejemplos few-shot, todos con todos los campos completos y fechas DD/MM/AAAA. ¿Cuál es el fix?**

- A) Agregar más ejemplos few-shot con más variedad de siniestros, todos completos
- B) Rehacer el few-shot: incluir un ejemplo cuyo output correcto tiene null, y todos los outputs con fechas ISO 8601
- C) Forzar tool_choice `{"type": "tool"}` para que el modelo respete el schema en cada respuesta
- D) Bajar la temperatura para que el modelo copie los ejemplos con menos variación

Elegí antes de seguir. La respuesta está al final del brief.

## 📱 El principio · 15 min

**"El modelo aprende del ejemplo más que de la instrucción."**

Ayer cerraste el contrato (schema); hoy alineás la demostración (few-shot). Si la instrucción dice una cosa y los ejemplos muestran otra, gana el ejemplo — casi siempre. Dos consecuencias directas:

1. **Few-shot sin nulls fabrica.** Si TODOS tus ejemplos traen todos los campos completos, el modelo aprende el patrón "siempre hay valor". Ante un documento incompleto, rellena — aunque el schema permita null y la description lo pida. El few-shot anti-fabricación INCLUYE ejemplos donde el output correcto es null: le mostrás cuándo usar la salida legal que el schema habilita.
2. **La normalización se demuestra.** Fechas a ISO 8601, montos numéricos sin símbolo ni separador de miles, categorías del enum: se especifica en el schema (types, enum, descriptions) Y se muestra en los ejemplos, con inputs sucios y outputs limpios. La conversión que el ejemplo demuestra vale más que la regla que la describe.

La accuracy se mejora **en capas**: schema correcto (día 5) → few-shot con nulls y formatos → descriptions de campo precisas → validación del lado cliente para lo crítico. Cada capa ataca lo que la anterior no cubre.

Traducción a tu mundo: el schema es la regla del firewall; el few-shot es el runbook con capturas reales. El operador nuevo hace lo que vio en las capturas, no lo que dice el párrafo 4.

## 📱 Escenarios de examen · 30 min

**E1 — El legajo fantasma (RRHH).** Extractor de legajos con schema impecable: nullable, descriptions, enum. Sigue inventando CUILes en legajos incompletos. El prompt tiene cinco ejemplos few-shot, todos completos. Fix: **sumar ejemplos donde el output tiene null**. Por qué: el patrón dominante de los ejemplos pisa el permiso del schema — nullable sin demostración es un permiso que nadie usa.

**E2 — Fechas mezcladas (energía).** Facturas de distribuidoras con "05/08/26", "5 de agosto de 2026", "2026-08-05". La instrucción dice "devolvé ISO 8601", pero los ejemplos muestran outputs DD/MM. La base recibe de todo. Fix: **ejemplos donde el input trae formatos sucios y el output sale 2026-08-05**. La instrucción sola pierde contra el ejemplo desalineado.

**E3 — Montos con símbolo (retail).** "$ 1.250.000,50" llega como string y rompe la agregación del warehouse. Fix: **type number en el schema + ejemplo que demuestre la conversión** ("$ 1.250.000,50" → 1250000.5). El schema fuerza el tipo; el ejemplo enseña a parsear el formato local.

**E4 — La última capa (agro).** Extractor de remitos con todo lo anterior aplicado; cada tanto un CUIT mal leído del escaneo llega con formato perfecto a pagos. Fix: **validación client-side** — dígito verificador, lookup contra el padrón — antes de pagar. Ninguna capa del modelo garantiza verdad al 100%: lo crítico se verifica con código, fuera del modelo.

## 📱 Matriz de decisión · 10 min

| Capa | Qué aporta | Qué NO cubre |
|---|---|---|
| 1. Schema: required + nullable + enum | contrato: ausencia legal, valores cerrados | hábitos del modelo, formato fino |
| 2. Few-shot con nulls y formatos | demuestra cuándo null y cómo normalizar | veracidad de cada valor |
| 3. Descriptions precisas por campo | criterio de casos borde, campo por campo | lo que un ejemplo desalineado contradiga |
| 4. Validación cliente | verificación determinística de lo crítico | no reemplaza a las anteriores: detecta, no enseña |

Trampas conocidas: 1) "agregá más ejemplos" con todos los campos completos **refuerza** la fabricación. 2) Instrucción de formato sin ejemplos alineados: gana el ejemplo. 3) Validación cliente como única defensa: detecta tarde, no corrige la fuente. 4) Few-shot sin schema: los ejemplos orientan, pero sin contrato no hay salida legal garantizada para la ausencia.

## 💻 Lab · 40 min

Abrí `labs/day-06-accuracy.md` en la PC: le vas a agregar few-shot al extractor del día 5, medir antes y después con facturas nuevas, y romperlo a propósito con ejemplos "completos".

## 📱 Quiz consolidado · 75 min

Quiz **day-06** en el dashboard: 18 preguntas de TODAS las zonas rojas — lo que salga rojo acá va directo al checkpoint de mañana.

## 📱 Respuesta de apertura

**B.** El few-shot desalineado es la causa doble: ejemplos todos completos enseñan a fabricar (el schema nullable queda sin uso demostrado) y outputs DD/MM enseñan el formato equivocado. A empeora: más ejemplos completos refuerzan el patrón "siempre hay valor". C es distractor de otro tema: tool_choice decide si se llama la tool, no la fidelidad de lo extraído — y la tool ya se llama. D hace que copie mejor... los ejemplos equivocados.
