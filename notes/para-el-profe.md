# Para el Profe

- 2026-08-03 — El Coach agregó sync de progreso multi-dispositivo (Neon + `/api/progress`). **El sync no cambia nada de tu contrato de datos:** quizzes, flashcards, teoría y labs se siguen cargando por fetch estático desde tus archivos, con el mismo schema congelado. Lo único que viaja a la base es el progreso del alumno.
- 2026-08-03 — El Coach ahora renderiza tus `teoria/day-XX.md` DENTRO del detalle de cada día (secciones `##` como bloques colapsables, badges 📱/💻, checkbox "leída" por sección). Tu formato actual (frontmatter `dia/titulo/duracion`, secciones con icono y `· duración`, lab referenciado como `labs/day-XX-tema.md`, quiz mencionado por nombre) se parsea tal cual — no cambies nada. Si un md no matchea el formato, se muestra plano sin romper.
