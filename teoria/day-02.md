---
dia: 2
titulo: Scoping MCP + métodos de contexto
duracion: 2h
---

## 📱 Pregunta de apertura · 5 min

**Agregaste un MCP server de tu base de datos con tu token personal usando `claude mcp add --scope project`. Al día siguiente, tu token aparece en el diff de un PR. ¿Cuál era la configuración correcta?**

- A) `--scope user`, y listo: nunca más aparece en el repo
- B) `--scope project`, pero con el token hardcodeado en un archivo aparte encriptado
- C) `--scope local` si el server es solo tuyo para este proyecto; project con `${DB_TOKEN}` (env var) si el server es del equipo
- D) Era correcto project: el problema es que el repo debería ser privado

Elegí antes de seguir. La respuesta está al final.

## 📱 El principio · 15 min

**Scopes: "local = yo + este proyecto · user = yo + todos mis proyectos · project = todo el equipo, vía `.mcp.json` en el repo."**

En tu mundo OT: local es una regla en tu host, user es tu perfil que te sigue a todas las máquinas, project es la política del sitio que se pushea a todo el mundo. El default de `claude mcp add` es **local**. Ante el mismo nombre en varios scopes, la precedencia es **local > project > user**. Y credenciales en `.mcp.json` compartido: **jamás literales** — referencias a env vars (`${VAR}`) que cada dev define en su entorno.

**Métodos de contexto: se eligen por vida útil de la información.** Siempre en cada sesión → CLAUDE.md (se carga automático). A veces, según la tarea → `@archivo` en el momento (o import `@path` en CLAUDE.md). Una sola vez → inline en el mensaje.

## 📱 Escenarios de examen · 30 min

**E1 — El token en el diff.** Credencial personal o server experimental aparece en `.mcp.json` de un PR → alguien usó scope project para algo personal. Fix: sacarlo del archivo; re-agregar en local (solo este proyecto) o user (todos tus proyectos). Si el server SÍ es del equipo: project con `${ENV_VAR}`.

**E2 — El server que desaparece.** Dev agrega un server sin flag de scope; en otro proyecto no está. No es un bug: el default es local (personal + ESE proyecto). Para tenerlo en todos sus proyectos → `--scope user`.

**E3 — "A mí me anda distinto".** Un dev clonó el server del equipo para experimentar y lo agregó en local con el mismo nombre. Sus tools se comportan raro; al resto le anda normal. Precedencia: su local pisa al project — solo para él. Fix: renombrar o borrar la copia local.

**E4 — La aprobación "sospechosa".** Dev nueva clona el repo y Claude Code le pide aprobar los servers de `.mcp.json`. Comportamiento esperado: seguridad ante servers que vienen del repo. Se re-pregunta con `claude mcp reset-project-choices`.

**E5 — El doc pegado a mano.** Convenciones que TODOS necesitan en CADA sesión, hoy pegadas a mano al arrancar → CLAUDE.md del proyecto, versionado. Lo que se olvida un humano, lo carga el harness.

**E6 — La mención que no carga.** CLAUDE.md dice "las convenciones están en docs/style.md" y Claude a veces no las lee. Una mención en prosa solo NOMBRA el archivo; el import `@docs/style.md` inyecta el contenido siempre. Y el stacktrace de un incidente puntual: inline, una vez — meterlo en CLAUDE.md contamina todas las sesiones futuras.

## 📱 Matriz de decisión · 10 min

| Scope | Quién lo ve | Dónde vive | Caso típico |
|---|---|---|---|
| local (default) | solo vos, solo este proyecto | config personal del proyecto | experimentos, credenciales propias |
| user | solo vos, TODOS tus proyectos | config global personal | tus herramientas de siempre |
| project | todo el equipo | `.mcp.json` en el repo | infra compartida (env vars para secrets) |

| Método de contexto | Vida útil | Costo |
|---|---|---|
| CLAUDE.md proyecto | cada sesión, todo el equipo | se paga en tokens SIEMPRE: solo lo esencial |
| CLAUDE.md usuario (~/.claude) | cada sesión, solo vos, todos tus proyectos | preferencias personales |
| `@archivo` / import | cuando la tarea lo pide / al cargar | contenido real, no promesa de lectura |
| inline | un solo mensaje | cero residuo |

Trampas: 1) "user para compartir con el equipo" — user es personal SIEMPRE; compartir = project. 2) La aprobación de `.mcp.json` no es un bug. 3) Mención en prosa ≠ `@`: una nombra, la otra carga. 4) CLAUDE.md obeso diluye lo importante y lo pagás en cada sesión. 5) Token literal en `.mcp.json` = incidente; `${VAR}` siempre.

## 💻 Lab · 40 min

Abrí `labs/day-02-mcp-scopes.md` en la PC: el mismo server en los 3 scopes, viendo quién lo ve y quién gana.

## 📱 Quiz del día · 20 min

Quiz **day-02** en la pestaña Quizzes — alimenta `mcp-scoping` y `context-methods` en el semáforo.

## 📱 Respuesta de apertura

**C.** El scope se decide por quién debe ver el server: solo vos en este proyecto → local; equipo → project pero con el secret como `${ENV_VAR}`, nunca literal. A (user) lo llevaría a TODOS tus proyectos sin necesidad, y B y D no resuelven que el secret no debe tocar el repo.
