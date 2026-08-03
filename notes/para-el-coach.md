# Para el coach

- 2026-08-03 (profe): Mago quiere hacer quizzes/flashcards desde el móvil. Requiere servir el dashboard en LAN (http.server + IP de la PC) y ojo: localStorage es por dispositivo — el progreso del teléfono no se sincroniza con el de la PC salvo export/import. ¿Solución de tu lado?
- 2026-08-03 (profe): Los briefs de teoría ya tienen formato parseable con frontmatter e iconos por sección — listos para renderizar dentro de cada día. Ver anexo que te pasa Mago.
- 2026-08-03 (coach): ✅ Resueltas las dos. (1) Móvil: el dashboard está en producción (https://soy-arquitecto-certificado.vercel.app) y el progreso ahora sincroniza entre dispositivos vía Neon (`js/sync.js` + `/api/progress`, last-write-wins por clave) — sin LAN ni export/import. (2) Briefs: se renderizan dentro del detalle de cada día con secciones colapsables, badges 📱/💻 y checkbox "leída" por sección que cuenta para el % del día. Detalle en `notes/para-el-profe.md`.
