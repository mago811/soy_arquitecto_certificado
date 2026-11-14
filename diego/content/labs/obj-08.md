---
objective: 8
title: "Lab: misma herramienta, dos tareas: ejecución directa vs plan mode (y una pasada multi-fase)"
minutes: 45
needs: ["Claude Code", "PowerShell", "git", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/permission-modes
    title: "Choose a permission mode"
  - url: https://code.claude.com/docs/en/common-workflows
    title: "Common workflows"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
status: verificada
---

## Objetivo

Sentir en carne propia cuándo conviene cada arquitectura:

- **Tarea chica** (un typo): directo vs plan. Medís tiempo y costo.
- **Tarea riesgosa** (cambiar cómo se guardan contraseñas): directo vs plan. Mirás qué te perdiste.
- **Multi-fase:** plan en `-p`, aprobación tuya, ejecución en otra corrida y review en un subagente.

## Pasos

1. **Proyecto de prueba.** En PowerShell, primero preparás la consola (una vez por ventana, para que los acentos viajen bien) y la carpeta:

   ```powershell
   $OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
   New-Item -ItemType Directory -Force $HOME\lab-obj08 | Out-Null
   Set-Location $HOME\lab-obj08
   git init -q
   ```

   Creá tres archivos con el editor (`code <archivo>`, o `notepad <archivo>` si no tenés VS Code), pegá el contenido y guardá.

   `README.md`:

   ```markdown
   # Mi app. Para recieve mensajes, corré npm start.
   ```

   `auth.js`:

   ```javascript
   const crypto = require('crypto');
   function hashPassword(p) { return crypto.createHash('md5').update(p).digest('hex'); }
   function check(p, h) { return hashPassword(p) === h; }
   module.exports = { hashPassword, check };
   ```

   `users.js`:

   ```javascript
   const { hashPassword, check } = require('./auth');
   const db = {};
   function register(u, p) { db[u] = hashPassword(p); }
   function login(u, p) { return check(p, db[u]); }
   module.exports = { register, login };
   ```

   Commiteá:

   ```powershell
   git add .
   git commit -qm base
   ```

2. **Tarea chica, directo:**

   ```powershell
   $inicio = Get-Date
   $r = claude -p "Corregí el typo 'recieve' en README.md" --allowedTools "Read,Edit" --output-format json | ConvertFrom-Json
   "segundos: $([int](((Get-Date) - $inicio).TotalSeconds))"
   $r | Select-Object subtype, num_turns, total_cost_usd
   git diff --stat
   git checkout README.md
   ```

3. **Tarea chica, con plan mode** (interactivo):

   ```powershell
   claude --permission-mode plan
   ```

   Pedile lo mismo. Fijate que primero propone un plan y espera tu aprobación. Aprobá. Compará el tiempo y los pasos con el paso 2. Anotá: ¿el plan te dio algo que valiera la espera? Salí con `/exit` y corré `git checkout README.md`.

4. **Tarea riesgosa, directo** (para ver el problema):

   ```powershell
   $r = claude -p "Cambiá el hash de contraseñas a algo seguro" --allowedTools "Read,Edit" --output-format json | ConvertFrom-Json
   $r.result
   git diff
   ```

   Preguntate:
   - ¿Qué pasa con los usuarios que ya tienen hash md5 guardado?
   - ¿Cambió la firma de `check`?
   - ¿Agregó una dependencia?

   Nadie te consultó nada antes de tocar el disco. Volvé atrás: `git checkout .`

5. **Tarea riesgosa, plan mode:**

   ```powershell
   claude --permission-mode plan
   ```

   Prompt: "Quiero pasar el hash de contraseñas a algo seguro. Tené en cuenta usuarios existentes."

   - Cuando muestre el plan, apretá `Ctrl+G` y editá algo. Por ejemplo, exigí usar solo el módulo `crypto` de Node (scrypt) y nada de dependencias nuevas.
   - Elegí **"Yes, manually approve edits"** y aprobá cada edición mirándola.
   - Compará con el paso 4: ¿qué decisiones aparecieron en el plan que el modo directo tomó en silencio?

6. **Multi-fase en modo script** (cómo se haría en CI):

   ```powershell
   git checkout .
   # Fase 1: planificar. En -p, plan mode no edita.
   $plan = claude -p "Planificá la migración del hash de contraseñas a scrypt con migración de usuarios existentes. Escribí el plan como lista numerada." --permission-mode plan --output-format json | ConvertFrom-Json
   $plan.result | Set-Content -Encoding utf8 PLAN.md
   git status --short    # tiene que aparecer solo PLAN.md (lo creó tu PowerShell), sin cambios en .js
   ```

   **Fase 2:** VOS abrís `PLAN.md` (`code PLAN.md`), lo leés y lo editás. Esa es la aprobación humana.

   ```powershell
   # Fase 3: ejecutar en una corrida nueva, con el plan aprobado como entrada.
   $impl = claude -p "Implementá exactamente el plan de PLAN.md. No hagas nada fuera del plan." --allowedTools "Read,Edit" --permission-mode dontAsk --max-turns 15 --output-format json | ConvertFrom-Json
   $impl.subtype
   # Fase 4: review independiente, en una corrida nueva que no vio la implementación.
   git diff | claude -p "Revisá este diff contra PLAN.md. Reportá solo lo que falte o esté mal; ignorá estilo." --tools "Read,Grep,Glob"
   ```

7. Completá esta tabla en tus notas:

   | Tarea | Directo: tiempo / costo / sorpresas | Plan: tiempo / costo / sorpresas | ¿Cuál elegís y por qué? |
   |---|---|---|---|
   | Typo | | | |
   | Hash de contraseñas | | | |

## Cómo sabés que salió bien

- En el paso 6, la fase 1 no tocó ningún `.js`. Eso confirma que plan mode "keeps its blocks" en `-p`.
- Explicás por qué para el typo plan mode es puro overhead, y para el hash es lo que evita rework.
- Explicás por qué la review de la fase 4 corre en otra corrida y no en la misma conversación que escribió el código.

## Si algo falla

- **No ves el plan ni las opciones de aprobación:** confirmá que la barra de estado diga `⏸ plan mode on`. Si no, apretá `Shift+Tab` hasta que aparezca.
- **En el paso 2 no editó:** te faltó `--allowedTools "Read,Edit"`. En `-p`, lo que pide aprobación se niega.
- **`Ctrl+G` no abre nada:** `Ctrl+G` abre el plan en tu editor de texto por defecto. Revisá que tengas uno configurado y reintentá.
- **`ConvertFrom-Json` tira "Invalid JSON primitive":** `claude` no imprimió JSON. Corré el mismo comando sin `| ConvertFrom-Json` y leé el error.
- **Los acentos salen como `Ã¡` o `?`:** te faltó la primera línea del paso 1 en esta ventana. Corrélo y repetí.
- **En el paso 6, fase 1, no devuelve un plan en `result`:** mirá `$plan.subtype`. Si es `error_max_turns`, sacá cualquier `--max-turns` bajo.
