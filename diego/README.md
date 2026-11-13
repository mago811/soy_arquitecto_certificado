# CCAR-F · App de estudio de Diego

App de un solo usuario para preparar el retake del examen **Claude Certified Architect – Foundations (CCAR-F)** del sábado 28/11/2026. Muestra un día del plan por vez (lección, laboratorio y práctica), tiene tres simulacros de 60 preguntas y 120 minutos, y sigue el progreso contra el score report del 13/11.

## Cómo está armada

- **Next.js 16 (App Router) + Tailwind v4**, en la carpeta `diego/` de este repo.
- **Contenido versionado en `content/`**: lecciones y labs en Markdown, preguntas en JSON. Se corrige con un PR. Formato y reglas en [`content/SPEC.md`](content/SPEC.md).
- **Progreso en Neon Postgres**: respuestas, repetición espaciada, simulacros, checklist y reglas repasadas. El esquema está en `db/schema.sql`.
- **Acceso**: una contraseña en `APP_PASSWORD`. La sesión es una cookie firmada con `SESSION_SECRET` y dura 30 días.
- Solo las preguntas con `status: "verificada"` aparecen en práctica y simulacros.

## Correrla en local

```bash
cd diego
npm install
cp .env.example .env.local   # completá DATABASE_URL, APP_PASSWORD y SESSION_SECRET
npm run db:init              # crea las tablas (idempotente)
npm run dev                  # http://localhost:3000
```

Si `DATABASE_URL` apunta a `localhost`, la app usa el driver `pg`, así podés probar con un Postgres común. Con cualquier otro host usa el driver HTTP de Neon.

Para probar un simulacro con pocas preguntas: `SIM_SIZE=4 npm run dev`.

## Deploy en Vercel

1. En Vercel, creá un proyecto nuevo desde este repo con **Root Directory = `diego`**. El framework se detecta solo.
2. Cargá las variables de entorno en Settings → Environment Variables:
   - `DATABASE_URL`: la connection string del proyecto Neon de Diego.
   - `APP_PASSWORD`: la contraseña que le vas a pasar a Diego.
   - `SESSION_SECRET`: 32 caracteres o más al azar, por ejemplo la salida de `openssl rand -base64 32`.
3. Corré `npm run db:init` una vez con esa `DATABASE_URL`.

## Contenido: cómo se genera y se verifica

El flujo tiene cuatro pasos y se puede volver a correr por objetivo:

1. **Generar.** `npm run generate -- --obj 16 --n 8 --sources <url1>,<url2>` baja las páginas oficiales y escribe preguntas nuevas en `content/questions/obj-16.json`. Todas quedan con `status: "no_verificado"`. Con `--pool sim` genera preguntas para los simulacros.
2. **Verificar.** `npm run verify -- --obj 16` revisa cada pregunta sin verificar con una llamada separada, que no ve el razonamiento del generador. Esa llamada recibe solo la pregunta y la página citada, y confirma tres cosas: que la correcta es correcta, que ningún distractor también lo es y que la cita respalda la respuesta. Cada pregunta termina `verificada` (verdict `ok` o `corregida`) o `descartada`.
3. **Validar.** `npm run validate` chequea el esquema y las reglas del SPEC: 4 opciones, `why_wrong` completo, fuentes oficiales, ids únicos, simulacros sin repetidos y reparto por dominio. Con `npm run validate -- --links` además chequea que cada link responda 200.
4. **Reportar.** `npm run report` genera `content/reports/content-report.md` (preguntas por objetivo) y `content/reports/no-verificado.md` (lo que falta revisar).

Los pasos 1 y 2 usan la API de Claude: necesitan `ANTHROPIC_API_KEY` en `.env.local`, con el modelo `claude-opus-5-5` por defecto (se cambia con `CLAUDE_MODEL`). El contenido de esta primera versión se generó y verificó con subagentes de Claude Code siguiendo el mismo contrato: uno escribe y otro, separado, verifica.

## Estructura

```
app/                 páginas (Hoy, Plan, Práctica, Repaso, Simulacros, Progreso, Errores, Reglas)
components/          piezas de UI
lib/                 contenido (lee content/), progreso (consultas), auth, fechas
content/
  objectives.json    los 37 objetivos, con dominio y línea base de Diego
  domains.json       los 5 dominios y sus pesos (guía oficial v1.0)
  plan.json          plan de 15 días, con tareas de ids estables
  lessons/ labs/     un .md por objetivo
  questions/         un .json por objetivo
  sims/              sim-1.json, sim-2.json, sim-3.json (60 ids cada uno)
  research/          notas de los generadores, con citas de la doc
  reports/           reportes generados
scripts/             generate, verify, validate, report, db-init
db/schema.sql
```

## Cómo se calcula

- **Dominio de un objetivo**: (base × 3 + aciertos) / (3 + intentos). El score report pesa como tres respuestas, así una buena racha se nota rápido sin borrar el punto de partida.
- **Repetición espaciada**: una pregunta fallada vuelve al día siguiente. Si la acertás, vuelve a los 3 días y después a los 7. Si la volvés a fallar, empieza de nuevo.
- **Puntaje estimado del simulacro**: 100 + 900 × porcentaje de aciertos. Es lineal y no es la escala oficial; la pantalla lo aclara.
- **Go/no-go**: se pone en verde con 80% o más en el simulacro 2, ningún dominio por debajo de 70% en ese simulacro y las 37 reglas de bolsillo repasadas.
