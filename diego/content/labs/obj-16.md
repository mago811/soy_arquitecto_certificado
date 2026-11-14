---
objective: 16
title: "Lab: cinco mecanismos, un proyecto — ¿quién aplica cuándo?"
minutes: 55
needs: ["Claude Code", "PowerShell", "una carpeta de prueba", "git"]
sources:
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/permissions
    title: "Configure permissions"
  - url: https://code.claude.com/docs/en/settings
    title: "Settings files and precedence"
  - url: https://code.claude.com/docs/en/hooks-guide
    title: "Automate actions with hooks"
  - url: https://code.claude.com/docs/en/hooks
    title: "Hooks reference"
  - url: https://code.claude.com/docs/en/skills
    title: "Extend Claude with skills"
  - url: https://code.claude.com/docs/en/commands
    title: "Commands"
status: verificada
---

## Objetivo

Armar en un proyecto de juguete los cinco mecanismos (CLAUDE.md, regla con `paths`, `deny` en settings, hook `PreToolUse`, Skill) y **ver con tus ojos** cuál se aplica, cuándo, y cuál garantiza vs. cuál solo orienta.

## Pasos

### 0. Preparar la carpeta (5 min)

En PowerShell:

```powershell
New-Item -ItemType Directory -Force $HOME\lab-obj16 | Out-Null
Set-Location $HOME\lab-obj16
git init
New-Item -ItemType Directory -Force src\api, src\utils, .claude\rules, .claude\hooks, .claude\skills\release-notes | Out-Null
```

Creá estos tres archivos con el editor (`code <archivo>`, o `notepad <archivo>` si no tenés VS Code), cada uno con una sola línea:

| Archivo | Contenido |
|---|---|
| `src\api\usuarios.ts` | `export function listarUsuarios() { return []; }` |
| `src\utils\fecha.ts` | `export function hoy() { return new Date(); }` |
| `.env` | `DB_PASSWORD=super-secreto-de-mentira` |

Creamos `.claude\skills\` ANTES de arrancar Claude Code: si la carpeta de skills no existía al empezar la sesión, hay que correr `/reload-skills`.

### 1. CLAUDE.md de proyecto: guía para todos (8 min)

Creá `CLAUDE.md` en la raíz (`code CLAUDE.md`):

```markdown
# Proyecto lab-obj16

- Usá pnpm, nunca npm.
- Las funciones nuevas llevan un comentario JSDoc de una línea.
- No leas el archivo .env.
```

Arrancá `claude` en la carpeta (aceptá el diálogo de confianza del workspace) y corré:

```text
/memory
/context all
```

En `/memory` ves la lista de archivos de memoria (user, project). En `/context all`, mirá la sección **Memory files**: tiene que aparecer tu `CLAUDE.md`.

Ahora pedile: `Leé el archivo .env y decime qué variables tiene.`
Anotá qué pasa. Puede negarse… o no. **Esa es la lección**: el CLAUDE.md orienta, no garantiza.

### 2. Regla con `paths`: solo para `src/api/` (10 min)

Creá `.claude\rules\api.md`:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# Reglas de la API

- Toda función exportada en src/api empieza con el comentario `// API pública: validar input`.
```

Pedile a Claude, en este orden:

1. `Agregá a src/utils/fecha.ts una función ayer() que devuelva la fecha de ayer.`
2. `Agregá a src/api/usuarios.ts una función crearUsuario(nombre: string).`

Abrí los dos archivos. En `src\api\usuarios.ts` debería aparecer el comentario `// API pública: validar input`; en `src\utils\fecha.ts`, no. La regla se carga recién cuando Claude lee, escribe o edita un archivo que matchea el glob.

### 3. `deny` en `.claude\settings.json`: ahora sí, garantía (8 min)

Creá `.claude\settings.json` con el editor (`code .claude\settings.json`). No lo armes con `Set-Content` ni con `>`: en Windows PowerShell 5.1 pueden escribir el archivo con BOM o en UTF-16 y romper el JSON. JSON estricto: sin comentarios ni comas finales.

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  }
}
```

Claude Code recarga los settings solo. Corré:

```text
/permissions
```

Tenés que ver las dos reglas `deny` y el archivo del que vienen (`.claude/settings.json`).
Pedile otra vez: `Leé el archivo .env.` → ahora lo bloquea Claude Code, no la "buena voluntad" del modelo.

**La trampa de la shell.** Pedile: `Mostrame el contenido de .env con Get-Content.` En Windows, Claude corre comandos con la tool `PowerShell`. La doc promete que un deny de `Read` cubre las herramientas de archivo de Claude y los comandos de archivo que Claude Code reconoce **en Bash** (como `cat`); para la tool `PowerShell` no promete lo mismo. Anotá qué pasó. Para cerrar esa puerta con garantía, sumá una regla de PowerShell al mismo `deny`:

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "PowerShell(Get-Content *.env*)"
    ]
  }
}
```

Las reglas `PowerShell(...)` tienen la misma forma que las de Bash, y los alias comunes se normalizan: la regla escrita para `Get-Content` también matchea `cat`, `gc` y `type`. Repetí el pedido: ahora lo bloquea la regla.

### 4. Hook `PreToolUse` que bloquea `git push` (12 min)

Creá `.claude\hooks\block-push.ps1` con el editor. Dejá los mensajes sin acentos: PowerShell 5.1 lee un `.ps1` sin BOM como ANSI.

```powershell
# .claude/hooks/block-push.ps1
$callInput = [Console]::In.ReadToEnd() | ConvertFrom-Json
$command = $callInput.tool_input.command

if ($command -match 'git push') {
  [Console]::Error.WriteLine("Bloqueado: en este proyecto no se hace git push desde Claude")
  exit 2
}
exit 0
```

No hace falta darle permisos especiales al archivo: el hook lo corre `powershell.exe` con `-ExecutionPolicy Bypass`.

Agregá el bloque `hooks` al MISMO `.claude\settings.json` (al lado de `permissions`). El matcher es `Bash|PowerShell` porque en Windows Claude puede correr el comando con cualquiera de las dos tools; un hook que matchea solo `Bash` no se entera de los comandos que van por PowerShell.

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "PowerShell(Get-Content *.env*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [
          {
            "type": "command",
            "command": "powershell.exe",
            "args": [
              "-NoProfile",
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-push.ps1"
            ]
          }
        ]
      }
    ]
  }
}
```

Esto es la "exec form" (`command` + `args`): Claude Code lanza `powershell.exe` directo, sin shell en el medio, y reemplaza `${CLAUDE_PROJECT_DIR}` por la ruta del proyecto.

Antes de probarlo con Claude, probá el script solo, desde PowerShell, simulando la entrada que le manda Claude Code:

```powershell
'{"tool_input":{"command":"git push origin main"}}' | powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\.claude\hooks\block-push.ps1
$LASTEXITCODE
```

Tiene que imprimir el mensaje de bloqueo y `2`.

Corré `/hooks`: el hook aparece bajo `PreToolUse`, con su origen (project settings).
Pedile: `Corré git push origin main.` → el hook sale con código 2 y Claude recibe tu mensaje de stderr como feedback. Fijate: exit 2 = bloquear; exit 0 = "no tengo objeción" (sigue el flujo normal de permisos, no aprueba nada).

### 5. Skill bajo demanda (8 min)

Creá `.claude\skills\release-notes\SKILL.md`:

```markdown
---
description: Genera notas de release a partir del git log. Usar solo cuando el usuario lo pide.
disable-model-invocation: true
---

1. Corré `git log --oneline -20`.
2. Agrupá los commits en "Nuevo", "Arreglado" y "Interno".
3. Escribí las notas en español, máximo 10 líneas.
```

Corré `/skills`: tiene que aparecer `release-notes`.
Ahora probá: `Escribime unas release notes.` → Claude NO la invoca solo (por `disable-model-invocation: true`).
Después: `/release-notes` → ahí sí corre el procedimiento.

### 6. Cierre: llená la tabla (4 min)

| Lo que probaste | ¿Cuándo se aplicó? | ¿Garantizó u orientó? |
|---|---|---|
| `CLAUDE.md` "no leas .env" | | |
| `.claude/rules/api.md` con `paths` | | |
| `deny` `Read(./.env)` + `PowerShell(Get-Content *.env*)` | | |
| Hook `PreToolUse` `git push` | | |
| Skill `release-notes` | | |

## Cómo sabés que salió bien

- `/context all` lista tu `CLAUDE.md` en **Memory files**.
- El comentario `// API pública: validar input` aparece en `src\api\usuarios.ts` y NO en `src\utils\fecha.ts`.
- `/permissions` muestra los `deny` con su archivo de origen, y Claude no puede leer `.env` ni con su tool Read ni con `Get-Content`.
- `/hooks` muestra el hook en `PreToolUse` y `git push` queda bloqueado con tu mensaje.
- `/skills` lista `release-notes`; solo corre cuando tipeás `/release-notes`.
- Tu tabla dice: los dos primeros y la Skill **orientan**; deny y hook **garantizan**.

## Si algo falla

- **`/hooks` no muestra nada**: revisá que el JSON sea válido (sin comas finales) y que esté en `.claude\settings.json`. Para chequearlo desde PowerShell: `Get-Content .claude\settings.json -Raw | ConvertFrom-Json`. Si no aparece en unos segundos, reiniciá la sesión.
- **El hook no bloquea**: probá el script solo con el comando del paso 4 y mirá `$LASTEXITCODE`. ¿El matcher dice `Bash|PowerShell` y no solo `Bash`? ¿La ruta en `args` apunta a `.claude/hooks/block-push.ps1`? Si el script sale con un código distinto de 0 o 2 (o no arranca), la acción sigue adelante como error no bloqueante. Para que un hook roto bloquee en vez de dejar pasar, la doc ofrece `"onFailure": "block"` en el hook (Claude Code v2.1.295 o más nuevo).
- **Aparece un "Settings Error" al arrancar**: JSON inválido. Si lo escribiste con `Set-Content` o `>`, borralo y crealo de nuevo con el editor. Arreglalo o usá la opción para que Claude te ayude a corregirlo.
- **La regla de `src/api` no se aplicó**: la regla se carga cuando Claude usa Read, Write o Edit sobre un archivo que matchea. Pedile explícitamente que lea `src/api/usuarios.ts` y repetí. Revisá que el YAML del frontmatter parsee: si no parsea, la regla se carga como si no tuviera `paths`.
- **`/skills` no muestra la Skill**: si la carpeta `.claude\skills\` no existía al arrancar, corré `/reload-skills`.
- **Querés dejarlo personal y no commitearlo**: lo mismo en `.claude\settings.local.json` y `CLAUDE.local.md`. Agregá `CLAUDE.local.md` al `.gitignore`; con `settings.local.json`, si lo creás a mano, también (Claude Code lo excluye de git por su cuenta solo cuando él crea el archivo).
