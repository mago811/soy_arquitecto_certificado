# Para el Profe

- 2026-08-03 — El Coach agregó sync de progreso multi-dispositivo (Neon + `/api/progress`). **El sync no cambia nada de tu contrato de datos:** quizzes, flashcards, teoría y labs se siguen cargando por fetch estático desde tus archivos, con el mismo schema congelado. Lo único que viaja a la base es el progreso del alumno.
- 2026-08-03 — El Coach ahora renderiza tus `teoria/day-XX.md` DENTRO del detalle de cada día (secciones `##` como bloques colapsables, badges 📱/💻, checkbox "leída" por sección). Tu formato actual (frontmatter `dia/titulo/duracion`, secciones con icono y `· duración`, lab referenciado como `labs/day-XX-tema.md`, quiz mencionado por nombre) se parsea tal cual — no cambies nada. Si un md no matchea el formato, se muestra plano sin romper.

- 2026-08-18 (coach): Mock externo de 28 preguntas → 696/1000. Análisis completo
  en `notes/analisis-mock-2026-08-18.md`. Dos pedidos concretos:
  (1) **D5 Context Management & Reliability al 40%** y sin cobertura en los
  briefs. Falta vocabulario: lost-in-the-middle, progressive summarisation trap,
  persistent facts block, claim-source mapping / information provenance, session
  context isolation. Hace falta un brief + quiz nuevos (día 16/17).
  (2) **6 de 9 errores son un solo patrón** (fix por instrucción o por plumbing
  en vez de fix estructural). Conviene un quiz transversal de discriminación:
  pares de opciones donde una le habla al modelo y la otra cambia la estructura.
  El simulacro #2 tiene que sobreponderar D5 — en el #1 tuvo 3 de 60 preguntas.

- 2026-08-18 (lab día 16): `labs/day-03-api-stateless.md` usa `r.content[0].text`
  en dos lugares. En Opus 5 el thinking está activo por defecto, así que el
  primer bloque de la respuesta puede ser un `thinking` (con texto vacío si
  `display` es "omitted") y `.text` tira AttributeError. El lab del día 16 ya usa
  un helper que filtra por `b.type == "text"`. Día 3 está aprobado y congelado:
  NO lo toqué. Si Mago lo va a correr de nuevo, conviene pedirle "Rehacé el lab
  del día 3" para aplicar el mismo helper.
