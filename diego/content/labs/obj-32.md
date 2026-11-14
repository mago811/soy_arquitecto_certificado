---
objective: 32
title: "Lab: diez tareas, cuatro herramientas"
minutes: 40
needs: ["Claude Code en Windows", "PowerShell", "Git for Windows", "VS Code o Notepad"]
sources:
  - url: https://code.claude.com/docs/en/tools-reference
    title: "Tools reference"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
status: verificada
---

## Objetivo

Antes de que Claude haga nada, vos decidís qué herramienta corresponde (Glob, Grep, Read, Bash o PowerShell, Edit, Write). Después comparás con lo que hizo. Y armás un subagente explorador de solo lectura donde el límite lo pone la config, no el prompt.

## Pasos

### 0. Preparar (5 min)

En PowerShell, desde tu carpeta de trabajo. Creá los archivos con `Set-Content -Encoding utf8` (en PowerShell 5.1, `>` escribe UTF-16):

```powershell
New-Item -ItemType Directory lab-obj32 | Out-Null
Set-Location lab-obj32
git init -b main
New-Item -ItemType Directory -Force src\components, migrations, certs\local, .claude\agents | Out-Null
Set-Content -Encoding utf8 -Path src\components\Button.tsx -Value 'export const Button = () => null;'
Set-Content -Encoding utf8 -Path src\components\Button.test.tsx -Value 'test("button", () => {});'
Set-Content -Encoding utf8 -Path src\tax.ts -Value 'export function calculateTax(x: number) { return x * 0.21; }'
Set-Content -Encoding utf8 -Path src\checkout.ts -Value 'import { calculateTax } from "./tax"; export const t = calculateTax(100);'
Set-Content -Encoding utf8 -Path src\config.ts -Value 'paymentsClient: { timeout: 30 }', 'searchClient: { timeout: 30 }'
Set-Content -Encoding utf8 -Path src\legacy.go -Value 'var x interface{}'
New-Item -ItemType File migrations\001_init.sql, migrations\002_users.sql | Out-Null
Set-Content -Encoding utf8 -Path certs\local\dev.pem -Value '-----BEGIN CERTIFICATE-----'
Set-Content -Encoding ascii -Path .gitignore -Value 'certs/local/'
```

Ahora los dos commits (uno en `main` y uno en la rama `feature`):

```powershell
git add -A
git commit -qm init
git checkout -qb feature
Add-Content -Encoding ascii -Path src\checkout.ts -Value '// cambio'
git commit -qam cambio
git log --oneline
```

`git log --oneline` tiene que mostrar dos commits: `cambio` e `init`.

### 1. El subagente explorador (5 min)

Abrí el archivo con el editor y pegá el contenido (no lo crees desde la terminal: el frontmatter tiene que arrancar en la primera línea, sin BOM):

```powershell
code .claude\agents\explorer.md
```

(o `notepad .claude\agents\explorer.md`). Contenido:

```markdown
---
name: explorer
description: Busca y lee código para responder preguntas sobre el repo. No edita ni ejecuta comandos.
tools: Read, Grep, Glob
---
Usá Glob para encontrar archivos por nombre, Grep para buscar contenido y Read solo para los archivos necesarios.
Devolvé rutas y líneas exactas.
```

`tools` es un allowlist: el explorer tiene Read, Grep y Glob, y **no** tiene Bash ni PowerShell. El límite lo pone la config, no el prompt. Guardá y arrancá `claude` en `lab-obj32`.

### 2. Predecí y comprobá (25 min)

Para cada tarea, **escribí en un papel tu predicción** y después pedile a Claude: "Usá el subagente explorer para…" (las tareas 1–4 y 9) o pedilo directo (el resto). Mirá qué herramienta usó.

| # | Tarea | Tu predicción |
|---|---|---|
| 1 | Listar todos los archivos `*.test.tsx` | |
| 2 | Encontrar quién llama a `calculateTax(` | |
| 3 | Encontrar los usos de `interface{}` | |
| 4 | Listar todos los `.pem`, incluidos los gitignored | |
| 5 | Ver qué hay dentro de `migrations/` | |
| 6 | Saber qué archivos cambiaron en la rama `feature` respecto de `main` | |
| 7 | Leer `src/config.ts` | |
| 8 | Cambiar `timeout: 30` a `60` solo en `paymentsClient` | |
| 9 | Pedirle al explorer que corra `git log` | |
| 10 | Crear `src/README.md` nuevo | |

Respuestas esperadas: 1 Glob · 2 Grep · 3 Grep con `interface\{\}` · 4 Glob (no respeta `.gitignore` por defecto) · 5 un comando de shell (`Get-ChildItem` por PowerShell o `ls` por Bash) o Glob `migrations/*`; nunca Read, que no lee carpetas · 6 shell (PowerShell o Bash) con `git diff --name-only main...HEAD` · 7 Read · 8 Edit con `old_string` que incluya `paymentsClient` · 9 el explorer no puede: no tiene Bash ni PowerShell · 10 Write.

### 3. Romperlo a propósito (5 min)

```text
En src/config.ts reemplazá "timeout: 30" por "timeout: 60" usando Edit con exactamente ese old_string y sin replace_all.
```

Mirá el error por string no único. Después pedí que lo arregle y observá cómo amplía el `old_string`.

## Cómo sabés que salió bien

- Acertaste al menos 8 de 10 predicciones.
- El explorer se negó o no pudo correr `git log`.
- En la tarea 4 apareció `certs/local/dev.pem`.
- En el paso 3 viste el error de Edit y el fix con más contexto (no `replace_all`).

## Si algo falla

- El subagente no aparece: el archivo tiene que estar en `.claude\agents\explorer.md` (fijate con `Get-ChildItem .claude\agents`); reiniciá `claude` si lo creaste con la sesión abierta.
- Claude no usa el subagente: nombralo explícitamente ("usá el subagente explorer").
- La tarea 6 da vacío: confirmá en tu PowerShell que estás en la rama `feature` con `git branch` (la rama actual sale con `*`).
- `git commit` falla con "Please tell me who you are": configurá una vez `git config --global user.name "Diego"` y `git config --global user.email "diego@example.com"`, y repetí los commits.
- En la tarea 5 o 6 Claude usó la tool PowerShell en vez de Bash (o al revés): está bien, las dos son tools de shell. Lo que cuenta es que no usó Read para la carpeta ni Glob para el diff.
