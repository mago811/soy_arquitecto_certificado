---
objective: 4
title: "Lab: el mismo subagente, delegado por pasos y por objetivo"
minutes: 40
needs: ["Claude Code", "una carpeta de prueba", "git"]
sources:
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
status: verificada
---

## Objetivo

Ver con tus ojos que un prompt de delegación **por pasos** no se adapta cuando el problema está donde no lo esperabas, y que uno **por objetivo** (con criterios, formato y límites) sí, sin que pierdas visibilidad: el reporte te dice qué cubrió y qué no.

## Pasos

### 0. Proyecto de juguete con una vulnerabilidad "escondida" (5 min)

En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj04
Set-Location lab-obj04
git init
New-Item -ItemType Directory -Force src, templates, tests, .claude\agents
code src\server.js
```

(Si no usás VS Code, cambiá `code` por `notepad` en todos los pasos.) Pegá esto en `src\server.js` y guardá:

```javascript
const { render } = require("../templates/render");
function handle(req) {
  // input del usuario
  const expr = req.query.formula;
  return render(expr);
}
module.exports = { handle };
```

Después `code templates\render.js` y pegá:

```javascript
function render(expr) {
  // ejecuta lo que llega del request
  const fn = new Function("return " + expr);
  return "<p>" + fn() + "</p>";
}
module.exports = { render };
```

Y por último `code tests\server.test.js` con una sola línea:

```javascript
test("ok", () => {});
```

Fijate: en `src/` no hay ningún `eval(`. La ejecución dinámica está en `templates/` y usa `new Function`.

Creamos `.claude\agents\` ANTES de abrir Claude Code para arrancar prolijos. Claude Code vigila esa carpeta y toma un agente nuevo en pocos segundos, sin reiniciar.

### 1. Definí el subagente auditor (5 min)

Creá el archivo con `code .claude\agents\auditor.md` y pegá:

```markdown
---
name: auditor
description: Audita código en busca de vulnerabilidades. Usalo cuando te pidan una auditoría de seguridad.
tools: Read, Grep, Glob
maxTurns: 15
---

Sos un auditor de seguridad. Trabajás solo con lectura.
Al terminar, siempre devolvés:
- HALLAZGOS: lista con archivo:línea, camino del dato y severidad (alta/media/baja).
- CUBIERTO: qué carpetas y patrones revisaste.
- NO CUBIERTO: lo que no llegaste a revisar y por qué.
```

`tools` limita al subagente a solo lectura y `maxTurns` le pone techo de turnos: esos dos límites los aplica Claude Code, no dependen de que el modelo "haga caso".

### 2. Delegación por pasos (10 min)

En la misma ventana de PowerShell (parado en `lab-obj04`) corré `claude` y pegá:

```text
Usá el subagente auditor con EXACTAMENTE estas instrucciones, sin agregar nada:
"1. Buscá con Grep 'eval(' en src/. 2. Leé cada match. 3. Reportá los que reciben input del usuario. No hagas nada más."
```

Anotá: ¿encontró `templates/render.js`? Lo más probable es que reporte "sin hallazgos": siguió el guion y el guion estaba mal.

### 3. Delegación por objetivo (10 min)

Corré `/clear` para empezar limpio y pegá:

```text
Usá el subagente auditor con este encargo:
"Objetivo: encontrar ejecución dinámica de código alimentada por input del usuario.
Alcance: src/ y templates/. No revises tests/ (lo cubre otro agente).
Hallazgo = existe un camino desde un request hasta la ejecución.
Presupuesto: hasta ~15 tool calls.
Devolvé el formato HALLAZGOS / CUBIERTO / NO CUBIERTO."
```

Compará: ahora el subagente elige qué buscar (`new Function`, `Function(`, imports), sigue el dato de `src/server.js` a `templates/render.js` y te dice qué cubrió.

### 4. Probá la trampa inversa: delegación vaga (5 min)

`/clear` y pegá:

```text
Lanzá dos subagentes auditor en paralelo, a los dos con el encargo "auditá la seguridad del proyecto".
```

Mirá los dos reportes: ¿revisaron lo mismo? Es el problema que cuenta Anthropic con "research the semiconductor shortage": instrucciones vagas → trabajo duplicado. Repetilo dándole a cada uno un alcance distinto (uno `src/` + `templates/`, otro `tests/`).

### 5. Visibilidad (5 min)

En cada corrida, mirá la sección **NO CUBIERTO**. Con eso el coordinador (vos o el agente principal) decide si re-delegar. No hizo falta dictar pasos para tener control.

## Cómo sabés que salió bien

- Paso 2: el auditor no encuentra la vulnerabilidad (o la encuentra solo de casualidad, saliéndose del guion).
- Paso 3: reporta `templates/render.js` con el camino `req.query.formula → render → new Function`.
- Paso 4: con encargo vago, los dos reportes se pisan; con alcances distintos, no.
- Podés explicar en una frase: "por objetivo = objetivo + criterio + formato + límites; el control lo dan el formato de reporte y los límites (`tools`, `maxTurns`)".

## Si algo falla

- **El subagente no aparece:** revisá que el archivo esté en `.claude\agents\auditor.md` (con `Get-ChildItem .claude\agents`) y tenga `name` y `description` en el frontmatter. Si igual no lo encuentra, reiniciá Claude Code y probá de nuevo (es lo que indica la doc).
- **Claude no delega y lo hace él mismo:** nombrá al subagente explícitamente ("Usá el subagente auditor…") o usá @-mention.
- **En el paso 2 igual lo encontró:** el modelo a veces se sale del guion. Hacé el guion todavía más cerrado y compará cuántas veces lo encuentra en 2–3 corridas.
