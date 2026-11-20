# App de estudio CCAR-F de Diego

Este directorio es una app independiente de la del resto del repo (la raíz es el dashboard de Mago). No mezcles una con otra.

- Alumno: Diego. Examen: sábado 28/11/2026. Primer intento: 313/1000 (aprueba con 720).
- Plan de 15 días (14/11 → 28/11) en `content/plan.json`. **No cambies los `id` de las tareas**: el checklist guardado en la base depende de ellos.
- Contenido: seguí `content/SPEC.md` al pie de la letra. Reglas duras:
  1. Solo los 37 objetivos de `content/objectives.json`, que son los de la currícula actual.
  2. Solo fuentes oficiales (code.claude.com, platform.claude.com/docs, modelcontextprotocol.io, guía del examen y Anthropic Academy).
  3. Cada pregunta lleva `source_url` + `source_quote`. Lo que no se puede respaldar queda `no_verificado` y no aparece en la app.
  4. Generar y verificar son pasos separados, hechos por agentes distintos. El que generó no verifica.
- **Preguntas (desde 20/11/2026): banco v2 en inglés**, escenarios largos anclados en los 6 escenarios oficiales del examen; explicaciones en español. Ver SPEC, sección "Preguntas v2". Las viejas en español quedaron `descartada` (ids < 21).
- **Test de nivel** (`/diagnostico`): autoevaluación por día + hasta 30 preguntas de práctica de los objetivos ya vistos. El informe tiene un resumen para pasarle al coach. Tabla `diag_attempts`.
- `npm run validate` también chequea el plan: un objetivo no puede tener la lección completa en dos días (pasó con el 37 en los días 4 y 5).
- Después de tocar contenido: `npm run validate` y `npm run report`.
- Dominios: los pesos están verificados contra la guía oficial v1.0 (27/18/20/20/15). El mapeo de los 37 objetivos a dominio es inferido por contenido, porque la guía tiene 30 task statements con otra redacción. Ver `content/research/exam-guide.md`.
- Stack: Next.js 16 (`proxy.ts`, no `middleware.ts`), Tailwind v4 y Neon. En local con Postgres común (`DATABASE_URL` a localhost usa `pg`).
