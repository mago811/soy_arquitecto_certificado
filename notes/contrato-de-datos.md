# Contrato de datos — Profe CCAR-F

Fuente: `js/app.js` (solo lectura), `data/plan.json`, `data/quizzes/day-00.json`, `data/flashcards.json`.
Terreno del profe: `data/quizzes/`, `data/flashcards.json`, `labs/`, `teoria/`, `notes/`. Jamás `index.html`, `js/`, `css/`, ni la estructura de `plan.json`.

---

## 1. Quiz — `data/quizzes/day-XX.json`

```json
{
  "id": "day-XX",
  "dia": 0,
  "titulo": "Día X: Tema",
  "preguntas": [
    {
      "id": "q1",
      "objetivo": "<id de plan.json>",
      "escenario": "Situación rota…",
      "opciones": ["A", "B", "C", "D"],
      "correcta": 1,
      "rationales": ["por qué A no", "por qué B sí", "por qué C no", "por qué D no"]
    }
  ]
}
```

Reglas que impone `app.js` (verificadas en el código):

1. **Acoplamiento `id` ↔ nombre de archivo.** El historial guarda `quizId = id + ".json"` y el picker cuenta intentos comparándolo con `archivo` del index. Si `id` ≠ nombre del archivo sin `.json`, el contador de intentos se rompe. `day-06.json` → `"id": "day-06"`, siempre.
2. **`opciones` y `rationales`: EXACTAMENTE 4 cada uno**, misma posición (las letras A–D están hardcodeadas). `correcta` es índice 0–3.
3. **`objetivo`: id exacto de `plan.json > objetivos`** — alimenta el semáforo. Un id inexistente no rompe nada pero se pierde el tracking. Los 16 válidos: `enforcement` · `mcp-scoping` · `context-methods` · `api-stateless` · `extraction-schemas` · `tool-choice` · `extraction-accuracy` · `decomposition` · `refinement` · `exploration` · `mcp-advanced` · `orchestration` · `hooks-config` · `api-batches` · `context-mgmt` · `review-loops`.
4. **Texto plano.** El dashboard escapea HTML y no renderiza markdown ni `\n`: escenario/opciones/rationales en un solo párrafo, sin tags, sin saltos de línea.
5. `preguntas[].id`: único dentro del archivo (`q1`, `q2`…).
6. Semáforo: <60% rojo · 60–84% amarillo · ≥85% verde, sobre las últimas 10 respuestas por objetivo.

**Registro en `data/quizzes/index.json`** — append a `disponibles` (sin este paso el quiz no aparece):

```json
{ "archivo": "day-XX.json", "titulo": "Día X: Tema", "dia": 0 }
```

`titulo` del index = `titulo` del quiz (es lo que ve el picker).

**Nombres de archivo:** `day-01.json` … `day-11.json` (dos dígitos) · consolidado del día 6 dentro de `day-06.json` (15–20 preguntas) · `simulacro-1.json` / `simulacro-2.json` (`"id": "simulacro-1"`, `"dia"`: 12 / 18) · `refuerzo-<tema>.json` (`"id": "refuerzo-<tema>"`).

**Volúmenes:** diario 8–10 preguntas · consolidado 15–20 · simulacro 60 · refuerzo 5.

---

## 2. Flashcards — `data/flashcards.json` (archivo único, se appendea al array `mazos`)

```json
{
  "mazos": [
    {
      "id": "slug-mazo",
      "nombre": "Nombre visible",
      "descripcion": "Una línea (opcional, se muestra en chico)",
      "cards": [
        { "id": "slug-mazo-1", "front": "pregunta", "back": "respuesta" }
      ]
    }
  ]
}
```

Reglas:

1. **`cards[].id` único GLOBAL** (entre todos los mazos): es la clave del SRS en localStorage. Cambiar un id aprobado = el alumno pierde el progreso de esa card. Convención para garantizarlo: prefijo del mazo + número (`tool-choice-1`).
2. Mazo existente **`principios-oro`** (cards `oro-1`…`oro-6`): congelado, no se toca.
3. SRS Leitner, box 1–4, intervalos 0/1/3/7 días. `front`/`back` texto plano (mismo escapeo que los quizzes).
4. Mazos previstos: matriz de mecanismos de config · valores de tool_choice · scopes MCP · técnicas anti-fabricación.

---

## 3. Markdown (sin schema, convención de paths)

- `teoria/00-syllabus.md` · `teoria/day-XX.md` (brief ≤ 1000 palabras)
- `labs/day-XX-<tema>.md` (lab ≤ 400 palabras) — opción B, confirmada por Mago en la compuerta de Etapa 0 (3/8/2026)
- `notes/registro-profesor.md` (una línea por hito) · `notes/para-el-coach.md` (hallazgos cruzados)

## 4. `data/plan.json`

Solo lectura para el profe. Los ids de `objetivos` y de `tareas` son sagrados (localStorage).

## 5. Validación

Todo JSON pasa por `python -m json.tool` antes de entregarse (en esta máquina Windows es `python`, no `python3`). El formato quiz está además verificado en runtime: `day-00.json` (idéntico shape) carga y corre en el dashboard desde el 3/8/2026.

---

## Ejemplos mínimos (validados con json.tool el 3/8/2026)

**Quiz mínimo** (`day-99.json` hipotético):

```json
{
  "id": "day-99",
  "dia": 99,
  "titulo": "Día 99: Ejemplo",
  "preguntas": [
    {
      "id": "q1",
      "objetivo": "enforcement",
      "escenario": "Un equipo exige que Claude Code nunca borre archivos .env, pero la regla escrita en CLAUDE.md fue ignorada en una sesión larga. ¿Cuál es el fix?",
      "opciones": [
        "Mover la regla al principio del CLAUDE.md",
        "Agregar un deny en permissions de settings.json",
        "Repetir la regla en cada prompt",
        "Usar un output style más estricto"
      ],
      "correcta": 1,
      "rationales": [
        "Sigue siendo guidance: el modelo puede ignorarla esté donde esté.",
        "Correcta: compliance = enforcement determinístico, fuera del modelo.",
        "Guidance manual y frágil: depende de un humano constante.",
        "Los output styles cambian el tono, no bloquean acciones."
      ]
    }
  ]
}
```

**Mazo mínimo** (append dentro de `mazos`):

```json
{
  "id": "ejemplo",
  "nombre": "Mazo de ejemplo",
  "descripcion": "Solo para el contrato",
  "cards": [
    { "id": "ejemplo-1", "front": "¿CLAUDE.md garantiza cumplimiento?", "back": "No: es guidance. Enforcement = hooks o permissions." }
  ]
}
```
