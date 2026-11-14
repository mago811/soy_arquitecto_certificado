# Spec de contenido — app de estudio CCAR-F de Diego

Este documento es el contrato entre los generadores, los verificadores y la app.
Todo archivo en `content/` tiene que cumplirlo; `npm run validate` lo chequea.

## Reglas que no se negocian

1. **Solo la currícula actual:** los 37 objetivos de `objectives.json`. Nada de otros temas.
2. **Solo fuentes oficiales:**
   - Claude Code: `https://code.claude.com/docs/en/...`
   - API de Claude (tool use, `tool_choice`, Message Batches, structured outputs, prompt engineering): `https://platform.claude.com/docs/en/...` (o `docs.claude.com` / `docs.anthropic.com` si redirigen ahí)
   - Agent SDK: `https://code.claude.com/docs/en/agent-sdk/...` o la sección Agent SDK de platform.claude.com
   - MCP: `https://modelcontextprotocol.io/...`
   - Guía oficial del examen y cursos de Anthropic Academy (`anthropic.skilljar.com`, `anthropic.com/learn`).
   Nada de bancos de preguntas, blogs de terceros, brain dumps ni Medium.
3. **Cada dato verificable:** cada lección, lab y pregunta lleva `source_url` / `sources` con la página oficial que lo respalda, y cada pregunta una `source_quote` (frase TEXTUAL copiada de esa página, en inglés, ≤ 300 caracteres). Si no lo podés respaldar, `status: "no_verificado"`.
4. **Español rioplatense neutro, masticado:** frases cortas, un concepto por vez, un ejemplo concreto. Tuteo/voseo suave ("vos"). Los nombres técnicos (flags, parámetros, archivos, campos) quedan en inglés y entre backticks, tal cual aparecen en el producto.
5. **Nunca inventes flags, campos ni comportamientos.** Si la doc no lo dice, no existe.

## Entorno de Diego: SOLO Windows + PowerShell (obligatorio en labs y lecciones)

Diego trabaja en **Windows 10/11 con PowerShell**. Todo comando, script y ruta de labs y lecciones tiene que ser para ese entorno. **No hay alternativas para macOS, Linux ni WSL**: nada de "en Mac hacé X". Fuente: https://code.claude.com/docs/en/setup (sección "Set up on Windows"), https://code.claude.com/docs/en/hooks (pestañas "Windows (PowerShell)"), https://code.claude.com/docs/en/tools-reference ("PowerShell tool").

- **Compatibilidad:** los comandos tienen que andar en **Windows PowerShell 5.1**, que es el que viene con Windows. No uses `&&` ni `||` (en 5.1 no existen): usá líneas separadas o `;`. Nada de `bash`, `sh`, heredocs (`<<EOF`), `export`, `cat`, `touch`, `chmod`, `rm -rf`, `grep`, `sed`, `which`, `source`, `curl ... | sh`.
- **Equivalencias:**
  - variable de entorno → `$env:ANTHROPIC_API_KEY = "sk-ant-..."` (solo dura la sesión de PowerShell)
  - leer un archivo → `Get-Content archivo`; buscar texto → `Select-String -Pattern "x" -Path .\src\*.ts`
  - crear carpeta → `New-Item -ItemType Directory -Force .claude\hooks`; borrar → `Remove-Item -Recurse -Force carpeta`
  - JSON → **nada de `jq`**: `$r = claude -p "..." --output-format json | ConvertFrom-Json; $r.result`
  - ver código de salida → `$LASTEXITCODE`
  - abrir/crear un archivo para editar → `code .claude\settings.json` (VS Code) o `notepad .claude\settings.json`. **Preferí que Diego cree los archivos con el editor y pegue el contenido**: `Set-Content`/`Out-File` en PowerShell 5.1 pueden escribir con BOM o UTF-16 y romper JSON/YAML. Si hace falta escribir desde la terminal, usá `Set-Content -Encoding utf8` solo para `.ps1`/`.py`/`.md`, nunca para JSON de settings.
  - rutas: barra invertida (`.claude\settings.json`). La carpeta de usuario es `$HOME\.claude\` (por ejemplo `C:\Users\Diego\.claude\CLAUDE.md`). Cuando la doc dice `~/.claude/`, en Windows es `$HOME\.claude\`.
- **Instalar Claude Code:** `irm https://claude.ai/install.ps1 | iex` y después, en una ventana nueva, `claude --version`.
- **Git for Windows:** asumí que está instalado (los labs usan `git`). Con Git for Windows, Claude Code usa Git Bash para su tool `Bash` y además tiene la tool `PowerShell` encendida por defecto (cuentas claude.ai/Console). Por eso: **los hooks que inspeccionan comandos de shell usan matcher `Bash|PowerShell`**, y las reglas de permisos de shell se escriben para las dos tools (`Bash(git push *)` y `PowerShell(git push *)`). En Windows, **Glob y Grep vienen en el set de tools por defecto** (no hay que habilitarlos).
- **Hooks:** scripts `.ps1` en `.claude\hooks\`, registrados en exec form como en la doc oficial:
  ```json
  { "type": "command", "command": "powershell.exe",
    "args": ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "${CLAUDE_PROJECT_DIR}/.claude/hooks/mi-hook.ps1"] }
  ```
  El script lee la entrada con `$in = [Console]::In.ReadToEnd() | ConvertFrom-Json` y bloquea con `exit 2` (mensaje a stderr con `[Console]::Error.WriteLine("...")`) o devolviendo el JSON de `hookSpecificOutput` con `ConvertTo-Json`.
- **Python:** `py -m venv .venv`, `.\.venv\Scripts\Activate.ps1`, `pip install anthropic`. Si PowerShell bloquea el script de activación: una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. Correr con `python archivo.py`. Variables: `$env:ANTHROPIC_API_KEY`.
- **Node/TypeScript:** `npm init -y`, `npm install @anthropic-ai/sdk`, `npx tsx archivo.ts`. Funcionan igual en PowerShell.
- **`claude -p` con prompts largos:** usá un archivo y `Get-Content prompt.txt -Raw | claude -p`, o comillas simples. Para pasar un diff: `git diff main | claude -p "..."`.
- **Bloques de código:** los comandos van en bloques ```` ```powershell ````; el contenido de archivos en el lenguaje del archivo (```` ```json ````, ```` ```python ````, etc.).

## Preguntas: `questions/obj-XX.json` (XX con dos dígitos: obj-06, obj-16)

```json
{
  "objective": 16,
  "questions": [
    {
      "id": "o16-q01",
      "objective": 16,
      "pool": "practice",
      "scenario": "Escenario concreto: una empresa, un sistema, un problema. Termina con la pregunta.",
      "options": ["A", "B", "C", "D"],
      "correct": 2,
      "why_correct": "Por qué la correcta es correcta (2–4 frases cortas).",
      "why_wrong": { "0": "Por qué A no.", "1": "Por qué B no.", "3": "Por qué D no." },
      "rule": "Regla en una línea que se lleva el que falla esta pregunta.",
      "source_url": "https://code.claude.com/docs/en/settings",
      "source_quote": "Frase textual de la página que respalda la respuesta.",
      "status": "no_verificado",
      "verification": null
    }
  ]
}
```

- `id`: `oXX-qNN` para el pool de práctica, `oXX-sNN` para el pool de simulacros. Únicos.
- `pool`: `"practice"` o `"sim"`. Las de `sim` NUNCA se muestran en práctica.
- 4 opciones exactas, una sola correcta. `correct` es el índice 0–3. **Variá la posición de la correcta** (no siempre la misma letra, más o menos pareja).
- `why_wrong` tiene exactamente las 3 claves de las incorrectas.
- Las opciones tienen largos parecidos: la correcta no puede ser siempre la más larga o la más detallada.
- Distractores plausibles: errores reales de alguien que conoce el tema por arriba (ej. "ponerlo en CLAUDE.md con IMPORTANT" cuando hace falta enforcement; "subir `max_tokens`"; "usar `tool_choice: auto`"). Nada absurdo.
- Formato examen: escenario → "¿qué hacés / cuál es el fix / qué configuración?". Nada de definiciones sueltas.
- El generador deja `status: "no_verificado"` y `verification: null`. Solo el verificador cambia esos campos.

## Pool de simulacros: `questions/sim-obj-XX.json`

Mismo formato que las de práctica, pero con `"pool": "sim"` e ids `oXX-sNN`. Van en un archivo aparte para no mezclarse con práctica.
Son escenarios más largos y con más contexto, como en el examen real (empresa + sistema + síntoma + restricción).
No pueden repetir escenarios de `questions/obj-XX.json`. La cuota por objetivo está en `research/sim-quota.json`.
`sims/sim-N.json` arma cada simulacro con 60 ids, respetando el reparto por dominio (16/12/12/11/9).

## Verificación (solo el verificador escribe esto)

```json
"status": "verificada" | "descartada" | "no_verificado",
"verification": { "date": "2026-11-13", "verdict": "ok" | "corregida" | "descartada", "notes": "qué chequeó / qué cambió" }
```

El verificador abre `source_url` y confirma:
(a) la respuesta marcada es correcta según la doc;
(b) ningún distractor también podría ser correcto según la doc;
(c) `source_quote` aparece (textual o casi textual) en esa página y respalda la afirmación.
Puede hacer correcciones chicas (redacción, ajustar un distractor ambiguo, arreglar el link o la cita) y marcar `corregida`. Si el problema es de fondo, `descartada` con la nota.

## Lecciones: `lessons/obj-XX.md`

```markdown
---
objective: 16
title: "Título corto en español"
rule: "Regla de bolsillo en una línea."
sources:
  - url: https://code.claude.com/docs/en/memory
    title: "Manage Claude's memory"
status: no_verificado
---

## Qué es
## Cuándo se usa
## El error típico que el examen quiere que cometas
## Ejemplo
## Para recordar
```

- 300–700 palabras. Tablas comparativas cuando ayuden (ej. mecanismo → cuándo aplica → ¿garantiza?).
- `status` lo cambia el verificador a `verificada` (o deja `no_verificado` con un comentario HTML `<!-- no verificado: ... -->` arriba de la sección dudosa).

## Labs: `labs/obj-XX.md`

```markdown
---
objective: 16
title: "Lab: ..."
minutes: 45
needs: ["Claude Code", "una carpeta de prueba"]   # o ["API key de Anthropic", "Python o Node"]
sources:
  - url: ...
    title: ...
status: no_verificado
---

## Objetivo
## Pasos
1. ... (con comandos/archivos exactos en bloques de código)
## Cómo sabés que salió bien
## Si algo falla
```

- 30–60 minutos, hecho en la máquina de Diego con Claude Code o la API.
- Todo comando, flag, campo de settings o parámetro de API tiene que existir en la doc citada.

## Archivos de investigación: `research/obj-XX.md`

Notas del generador: URLs leídas y citas textuales relevantes. No se muestran en la app, sirven para auditar.
