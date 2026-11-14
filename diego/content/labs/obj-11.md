---
objective: 11
title: "Lab: un job de CI con claude -p, salida JSON, permisos y topes"
minutes: 45
needs: ["Claude Code", "PowerShell", "Node.js", "una carpeta de prueba con git", "unos centavos de crédito de API o tu suscripción"]
sources:
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/agent-sdk/agent-loop
    title: "How the agent loop works"
  - url: https://code.claude.com/docs/en/permission-modes
    title: "Choose a permission mode"
  - url: https://code.claude.com/docs/en/permissions
    title: "Configure permissions"
  - url: https://code.claude.com/docs/en/tools-reference
    title: "Tools reference"
status: verificada
---

## Objetivo

Armar a mano lo que haría un pipeline:

1. Correr Claude sin interacción.
2. Leer el resultado con `ConvertFrom-Json`.
3. Ver qué pasa cuando faltan permisos.
4. Ver qué pasa cuando se pega contra el tope de turnos y el de gasto.

Al final vas a tener un script de PowerShell que falla el "build" cuando algo sale mal.

## Pasos

1. **Preparar la consola.** Abrí PowerShell y corré esto una vez por ventana. Sin esto, los acentos de las respuestas pueden salir rotos:

   ```powershell
   $OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
   ```

2. Armá la carpeta de prueba:

   ```powershell
   New-Item -ItemType Directory -Force $HOME\lab-obj11 | Out-Null
   Set-Location $HOME\lab-obj11
   git init -q
   code suma.js
   ```

   (Si no tenés VS Code, usá `notepad suma.js`.) Pegá esto, con el bug, y guardá:

   ```javascript
   function suma(a, b) { return a - b; }
   module.exports = suma;
   ```

   Después `code test.js`, pegá y guardá:

   ```javascript
   const suma = require('./suma');
   if (suma(2, 3) !== 5) { console.error('FAIL'); process.exit(1); }
   console.log('OK');
   ```

   Y commiteá:

   ```powershell
   git add .
   git commit -qm init
   ```

3. Primera corrida no interactiva, solo lectura, con salida JSON:

   ```powershell
   $r1 = claude -p "¿Qué hace suma.js? Una frase." --output-format json | ConvertFrom-Json
   $r1.PSObject.Properties.Name
   $r1 | Select-Object subtype, result, total_cost_usd, num_turns, session_id
   ```

   La primera línea lista las claves. Tienen que aparecer `result`, `session_id` y `total_cost_usd`. Anotá el `subtype`: debería ser `success`.

4. **Rompelo: sin permisos.** Pedile que arregle el bug sin aprobar nada:

   ```powershell
   $r2 = claude -p "Arreglá suma.js para que node test.js imprima OK" --output-format json | ConvertFrom-Json
   $r2.subtype
   $r2.permission_denials | ConvertTo-Json -Depth 5
   git diff --stat
   ```

   Según la doc, en un `-p` en modo Manual "a call that needs approval is denied". Lo esperable: `git diff` vacío y algo en `permission_denials`. (Antes de v2.1.302, una corrida `-p` podía arrancar en auto mode: si tu versión es vieja, anotá lo que veas. Para eso es el lab.)

5. **Arreglalo con permisos justos + dontAsk.** En Windows, Claude puede correr `node test.js` con la tool `Bash` (Git Bash) o con la tool `PowerShell`. Por eso aprobás el comando en las dos:

   ```powershell
   $permisos = "Read,Edit,Bash(node test.js),PowerShell(node test.js)"
   $r3 = claude -p "Arreglá suma.js para que node test.js imprima OK. Respondé OK o FAIL." --allowedTools $permisos --permission-mode dontAsk --output-format json | ConvertFrom-Json
   $r3 | Select-Object subtype, result, num_turns, total_cost_usd
   node test.js
   git checkout suma.js   # volvé al estado roto para el paso siguiente
   ```

6. **Rompelo: tope de turnos demasiado bajo.**

   ```powershell
   $r4 = claude -p "Arreglá suma.js y corré node test.js para confirmar" --allowedTools $permisos --permission-mode dontAsk --max-turns 1 --output-format json | ConvertFrom-Json
   "exit code: $LASTEXITCODE"
   $r4 | Select-Object subtype, @{n='has_result'; e={ $_.PSObject.Properties.Name -contains 'result' }}, num_turns, total_cost_usd
   ```

   Esperado: `subtype` = `error_max_turns` y `has_result` = `False`. `$LASTEXITCODE` guarda el código de salida de `claude` (el último programa nativo del pipeline). Anotalo: la doc dice que es distinto de 0 "when the run fails"; fijate qué hace tu versión con un tope de turnos. La doc del agent loop explica que cada turno con tool calls cuenta, "plus one for the final text-only response".

7. **Rompelo: tope de gasto mínimo.**

   ```powershell
   git checkout suma.js
   $r5 = claude -p "Explicá en detalle cada archivo del repo y después arreglá el bug" --allowedTools "Read,Edit" --permission-mode dontAsk --max-budget-usd 0.01 --output-format json | ConvertFrom-Json
   $r5 | Select-Object subtype, total_cost_usd
   ```

   Esperado: `error_max_budget_usd`. Fijate si `total_cost_usd` quedó **arriba** de 0.01. La doc avisa: "Spend can pass the cap, so leave headroom."

8. **El script de CI.** Creá `ci.ps1` con `code ci.ps1`, pegá esto y guardá. Los textos van sin acentos a propósito: Windows PowerShell 5.1 lee un `.ps1` sin BOM como ANSI y rompería los acentos del prompt.

   ```powershell
   # ci.ps1
   $OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
   git checkout -q suma.js

   $opts = @(
     "--allowedTools", "Read,Edit,Bash(node test.js),PowerShell(node test.js)",
     "--permission-mode", "dontAsk",
     "--max-turns", "10",
     "--max-budget-usd", "1.00",
     "--output-format", "json"
   )
   $out = claude -p "Arregla suma.js para que node test.js imprima OK. Responde OK o FAIL." @opts | ConvertFrom-Json
   $code = $LASTEXITCODE

   Write-Host "exit=$code subtype=$($out.subtype) costo=$($out.total_cost_usd)"
   if ($out.subtype -ne "success") {
     Write-Host "Claude no termino: $($out.subtype)"
     exit 1
   }
   Write-Host $out.result

   node test.js
   if ($LASTEXITCODE -ne 0) { exit 1 }
   exit 0
   ```

   Corrélo así (el `-ExecutionPolicy Bypass` evita el bloqueo de scripts de Windows solo para esta corrida):

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\ci.ps1
   "ci.ps1 salió con: $LASTEXITCODE"
   ```

   Después cambiá `"10"` por `"1"` en `--max-turns`, guardá, corrélo de nuevo y confirmá que el script sale con 1 y un mensaje claro, sin imprimir una respuesta vacía.

9. **Bonus (`--bare`).** Si tenés API key:

   ```powershell
   $env:ANTHROPIC_API_KEY = "sk-ant-..."
   (claude --bare -p "¿Qué hace suma.js?" --allowedTools "Read" --output-format json | ConvertFrom-Json).result
   Remove-Item Env:\ANTHROPIC_API_KEY
   ```

   `$env:` solo dura en esta ventana de PowerShell; igual la borramos al final. `--bare` no carga tus hooks, MCP ni CLAUDE.md, y no usa el login de suscripción.

## Cómo sabés que salió bien

- Explicás sin mirar por qué el paso 4 no editó nada y qué flag lo arregló.
- En el paso 6 viste `error_max_turns`, y en el 7, `error_max_budget_usd`.
- `ci.ps1` sale con 0 cuando todo anda y con 1 cuando pega contra un tope (lo decide el chequeo de `subtype`, no el exit code de `claude`). Nunca imprime una respuesta vacía como si fuera el resultado.
- Sabés de dónde sale el costo de cada corrida (`total_cost_usd`).

## Si algo falla

- **`ConvertFrom-Json` tira "Invalid JSON primitive":** `claude` no imprimió JSON (por ejemplo, un flag mal escrito manda el error a stderr antes de arrancar). Corré el mismo comando sin `| ConvertFrom-Json` y leé qué sale.
- **Los acentos salen como `Ã¡` o `?`:** te faltó el paso 1 en esta ventana. Corrélo y repetí.
- **"running scripts is disabled on this system" al correr `.\ci.ps1`:** corrélo con `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\ci.ps1`, como en el paso 8. Si preferís, una sola vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **Pide login o falla la autenticación:** corré `claude` una vez en modo interactivo para loguearte. Con `--bare` necesitás `$env:ANTHROPIC_API_KEY` sí o sí.
- **El paso 4 sí editó:** puede que tengas reglas `permissions.allow` en tu `$HOME\.claude\settings.json` o en el proyecto. Revisalas con `/permissions` en una sesión interactiva, o repetí con `--bare`.
- **El paso 5 no corrió el test:** mirá `$r3.permission_denials`. Si aparece una tool que no aprobaste, sumala con el mismo comando: `PowerShell(node test.js)` o `Bash(node test.js)`.
- **Tu versión no reconoce `--max-budget-usd`:** tu Claude Code es viejo. Actualizalo (`claude update`).
- **El paso 6 terminó en `success`:** el modelo lo resolvió sin herramientas. Pedile algo que obligue a usar varias (leer, editar y correr el test).
