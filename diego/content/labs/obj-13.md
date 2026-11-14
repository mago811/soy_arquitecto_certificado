---
objective: 13
title: "Lab: una review automática con estándares del repo, herramientas mínimas y salida JSON validada"
minutes: 50
needs: ["Claude Code", "PowerShell", "git", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/github-actions
    title: "Claude Code GitHub Actions"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
status: verificada
---

## Objetivo

Armar un reviewer que:

1. aplique los estándares del `CLAUDE.md` del repo;
2. no pueda editar nada;
3. devuelva hallazgos en un JSON con schema, que un script usa para fallar el build si hay algo `high`.

## Pasos

1. **Preparar la consola.** Corré esto una vez por ventana de PowerShell. Hace que el diff que le pasás a Claude por el pipe y la respuesta viajen en UTF-8:

   ```powershell
   $OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
   ```

2. Repo de prueba con un estándar y un cambio que lo viola:

   ```powershell
   New-Item -ItemType Directory -Force $HOME\lab-obj13 | Out-Null
   Set-Location $HOME\lab-obj13
   git init -q
   code CLAUDE.md
   ```

   (Sin VS Code: `notepad CLAUDE.md`.) Pegá y guardá:

   ```markdown
   # Estándares de review
   - Prohibido loguear datos personales (email, DNI, tarjeta) con console.log.
   - Toda consulta SQL usa parámetros; nunca concatenar strings.
   - No reportes temas de estilo ni formato.
   ```

   Creá `db.js` (`code db.js`) con una sola línea, guardá y commiteá:

   ```javascript
   module.exports = {};
   ```

   ```powershell
   git add .
   git commit -qm base
   ```

   Ahora abrí `db.js` de nuevo, reemplazá todo por esto y guardá (este es el cambio a revisar, sin commitear):

   ```javascript
   function buscar(db, email) {
     console.log("buscando", email);
     return db.query("SELECT * FROM users WHERE email = '" + email + "'");
   }
   module.exports = { buscar };
   ```

3. Creá `schema.json` con el editor (`code schema.json`), pegá y guardá:

   ```json
   {"type":"object",
    "properties":{"findings":{"type":"array","items":{"type":"object",
      "properties":{"file":{"type":"string"},"line":{"type":["integer","null"]},
        "severity":{"type":"string","enum":["high","medium","low"]},
        "rule":{"type":"string"},"issue":{"type":"string"}},
      "required":["file","severity","rule","issue"]}}},
    "required":["findings"]}
   ```

   Después cargalo en una variable lista para pasarle a `claude`:

   ```powershell
   $schema = (Get-Content .\schema.json -Raw | ConvertFrom-Json | ConvertTo-Json -Depth 20 -Compress) -replace '"', '\"'
   ```

   ¿Por qué el `-replace`? Windows PowerShell 5.1 se come las comillas dobles de adentro de un argumento cuando llama a un programa como `claude`. Escaparlas como `\"` hace que el JSON llegue entero.

4. Primera versión, **la ingenua**: le pedís JSON en el prompt, sin schema.

   ```powershell
   $naive = git diff | claude -p "Revisá este diff y respondé SOLO un JSON con una lista de findings" --output-format json | ConvertFrom-Json
   try { ($naive.result | ConvertFrom-Json -ErrorAction Stop).findings } catch { "NO PARSEA" }
   ```

   Corrélo 2 o 3 veces. Fijate si a veces viene con texto o con un bloque de código alrededor. Eso es lo que rompe a un bot.

5. Versión buena: diff por stdin, herramientas mínimas, schema.

   ```powershell
   $review = git diff | claude -p "Revisá este diff contra los estándares del CLAUDE.md. Reportá solo violaciones." --tools "Read,Grep,Glob" --output-format json --json-schema $schema | ConvertFrom-Json
   if ($review.PSObject.Properties.Name -contains 'structured_output') { $review.structured_output.findings | Format-List } else { "sin structured_output: $($review.subtype)" }
   ```

   Esperado: dos hallazgos `high` en `db.js` (el log del email y el SQL concatenado), cada uno con su `rule`.

6. **Rompelo: `--bare`.** Corré lo mismo agregando `--bare`. Necesitás una API key en esta ventana:

   ```powershell
   $env:ANTHROPIC_API_KEY = "sk-ant-..."
   ```

   ¿Sigue citando las reglas del CLAUDE.md? `--bare` saltea el CLAUDE.md. Arreglalo sin sacar `--bare`:

   ```powershell
   $bare = git diff | claude --bare -p "Revisá este diff contra los estándares. Reportá solo violaciones." --append-system-prompt-file .\CLAUDE.md --tools "Read,Grep,Glob" --output-format json --json-schema $schema | ConvertFrom-Json
   $bare.structured_output.findings | Format-List
   ```

   Al terminar el paso: `Remove-Item Env:\ANTHROPIC_API_KEY`.

7. **Rompelo: herramientas.** Corré la review sin `--tools`, pero con un prompt que pide cambios:

   ```powershell
   $r7 = git diff | claude -p "Revisá el diff y corregí lo que encuentres" --output-format json | ConvertFrom-Json
   $r7.permission_denials | ConvertTo-Json -Depth 5
   git diff --stat
   ```

   Mirá `permission_denials` y `git diff`. Después repetí con `--tools "Read,Grep,Glob"`. Ahora Claude ni siquiera tiene Edit para intentarlo (ni las tools `Bash` o `PowerShell`, que tampoco están en la lista). Ojo: `--allowedTools "Read"` **no** sirve para esto. Solo pre-aprueba Read; no saca Edit.

8. El gate de CI. Creá `review.ps1` con el editor, pegá y guardá. Los textos van sin acentos: Windows PowerShell 5.1 lee un `.ps1` sin BOM como ANSI.

   ```powershell
   # review.ps1
   $OutputEncoding = [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
   $schema = (Get-Content .\schema.json -Raw | ConvertFrom-Json | ConvertTo-Json -Depth 20 -Compress) -replace '"', '\"'

   $r = git diff | claude -p "Revisa este diff contra los estandares del CLAUDE.md. Reporta solo violaciones." --tools "Read,Grep,Glob" --max-turns 8 --output-format json --json-schema $schema | ConvertFrom-Json

   if ($r.PSObject.Properties.Name -notcontains 'structured_output') {
     Write-Host "Sin salida estructurada (subtype: $($r.subtype))"
     exit 2
   }
   $findings = @($r.structured_output.findings)
   foreach ($f in $findings) {
     Write-Host "$($f.severity)`t$($f.file):$($f.line)`t$($f.issue)"
   }
   $high = @($findings | Where-Object { $_.severity -eq 'high' }).Count
   if ($high -gt 0) {
     Write-Host "$high hallazgos high"
     exit 1
   }
   exit 0
   ```

   Corrélo con el bug:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\review.ps1
   "review.ps1 salió con: $LASTEXITCODE"
   ```

   Tiene que salir con 1. Arreglá `db.js` (sin log, query parametrizada), corrélo de nuevo y debería salir con 0.

9. Leé el workflow de review de https://code.claude.com/docs/en/github-actions ("Run a skill"). Ubicá en el YAML:
   - qué hace `--comment`;
   - por qué `claude_args` nombra `mcp__github_inline_comment__create_inline_comment`;
   - qué permisos tiene el job (`contents: read`, etc.).

## Cómo sabés que salió bien

- `review.ps1` falla con el bug y pasa sin él.
- Explicás por qué el paso 4 es frágil y el 5 no.
- Explicás la diferencia entre `--tools` y `--allowedTools` con tus palabras.
- Sabés que `--bare` no carga el CLAUDE.md y cómo compensarlo.

## Si algo falla

- **`Error: --json-schema is not a valid JSON Schema`:** puede ser el archivo o las comillas. Primero validá el archivo: `Get-Content .\schema.json -Raw | ConvertFrom-Json`. Si eso anda, revisá que hayas armado `$schema` con el `-replace` del paso 3. (Si usás PowerShell 7.3 o más nuevo en vez del 5.1 que viene con Windows, las comillas ya viajan bien: sacá el `-replace`.)
- **No aparece `structured_output`:** mirá `$review.subtype`. Si es `error_max_turns`, subí `--max-turns`. Si es `error_max_structured_output_retries`, simplificá el schema.
- **`ConvertFrom-Json` tira "Invalid JSON primitive":** `claude` no imprimió JSON. Corré el mismo comando sin `| ConvertFrom-Json` y leé el error.
- **Reporta estilo igual:** reforzá el prompt ("skip style"). La doc avisa que un reviewer al que le piden problemas "will always find something".
- **`--bare` pide credenciales:** cargá `$env:ANTHROPIC_API_KEY` en esa misma ventana. `--bare` no usa el login de suscripción.
- **"running scripts is disabled on this system":** corré el script con `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\review.ps1`, como en el paso 8.
