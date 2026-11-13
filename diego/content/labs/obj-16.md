---
objective: 16
title: "Lab: cinco mecanismos, un proyecto — ¿quién aplica cuándo?"
minutes: 55
needs: ["Claude Code", "una carpeta de prueba", "git", "jq"]
sources:
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/permissions
    title: "Configure permissions"
  - url: https://code.claude.com/docs/en/settings
    title: "Settings files and precedence"
  - url: https://code.claude.com/docs/en/hooks-guide
    title: "Automate actions with hooks"
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

`jq` lo usan los ejemplos de hooks de la doc. Si no lo tenés: `brew install jq` (macOS) o `apt-get install jq` (Debian/Ubuntu).

```bash
mkdir lab-obj16 && cd lab-obj16
git init
mkdir -p src/api src/utils .claude/rules .claude/hooks .claude/skills/release-notes
echo 'export function listarUsuarios() { return []; }' > src/api/usuarios.ts
echo 'export function hoy() { return new Date(); }' > src/utils/fecha.ts
echo 'DB_PASSWORD=super-secreto-de-mentira' > .env
```

Creamos `.claude/skills/` ANTES de arrancar Claude Code: si la carpeta de skills no existía al empezar la sesión, hay que correr `/reload-skills`.

### 1. CLAUDE.md de proyecto: guía para todos (8 min)

Creá `CLAUDE.md` en la raíz:

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

Creá `.claude/rules/api.md`:

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

Abrí los dos archivos. En `src/api/usuarios.ts` debería aparecer el comentario `// API pública: validar input`; en `src/utils/fecha.ts`, no. La regla se carga recién cuando Claude lee, escribe o edita un archivo que matchea el glob.

### 3. `deny` en `.claude/settings.json`: ahora sí, garantía (8 min)

Creá `.claude/settings.json` (JSON estricto: sin comentarios ni comas finales):

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
Pedile otra vez: `Leé el archivo .env.` → ahora lo bloquea Claude Code, no la "buena voluntad" del modelo. Probá también `Mostrame .env con cat` → un deny de `Read` también cubre comandos de archivo que Claude Code reconoce, como `cat`.

### 4. Hook `PreToolUse` que bloquea `git push` (12 min)

Creá `.claude/hooks/block-push.sh`:

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
if echo "$COMMAND" | grep -q "git push"; then
  echo "Bloqueado: en este proyecto no se hace git push desde Claude" >&2
  exit 2
fi
exit 0
```

```bash
chmod +x .claude/hooks/block-push.sh
```

Agregá el bloque `hooks` al MISMO `.claude/settings.json` (al lado de `permissions`):

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-push.sh"
          }
        ]
      }
    ]
  }
}
```

Corré `/hooks`: el hook aparece bajo `PreToolUse`, con su origen (project settings).
Pedile: `Corré git push origin main.` → el hook sale con código 2 y Claude recibe tu mensaje de stderr como feedback. Fijate: exit 2 = bloquear; exit 0 = "no tengo objeción" (sigue el flujo normal de permisos, no aprueba nada).

### 5. Skill bajo demanda (8 min)

Creá `.claude/skills/release-notes/SKILL.md`:

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
| `deny` `Read(./.env)` | | |
| Hook `PreToolUse` `git push` | | |
| Skill `release-notes` | | |

## Cómo sabés que salió bien

- `/context all` lista tu `CLAUDE.md` en **Memory files**.
- El comentario `// API pública: validar input` aparece en `src/api/usuarios.ts` y NO en `src/utils/fecha.ts`.
- `/permissions` muestra los dos `deny` con su archivo de origen, y Claude no puede leer `.env`.
- `/hooks` muestra el hook en `PreToolUse` y `git push` queda bloqueado con tu mensaje.
- `/skills` lista `release-notes`; solo corre cuando tipeás `/release-notes`.
- Tu tabla dice: los dos primeros y la Skill **orientan**; deny y hook **garantizan**.

## Si algo falla

- **`/hooks` no muestra nada**: revisá que el JSON sea válido (sin comas finales) y que esté en `.claude/settings.json`. Si no aparece en unos segundos, reiniciá la sesión.
- **El hook no bloquea**: ¿hiciste `chmod +x`? ¿Está instalado `jq`? Si el script sale con un código distinto de 0 o 2, la acción sigue adelante como error no bloqueante.
- **Aparece un "Settings Error" al arrancar**: JSON inválido. Arreglalo o usá la opción para que Claude te ayude a corregirlo.
- **La regla de `src/api` no se aplicó**: la regla se carga cuando Claude usa Read, Write o Edit sobre un archivo que matchea. Pedile explícitamente que lea `src/api/usuarios.ts` y repetí. Revisá que el YAML del frontmatter parsee: si no parsea, la regla se carga como si no tuviera `paths`.
- **`/skills` no muestra la Skill**: si la carpeta `.claude/skills/` no existía al arrancar, corré `/reload-skills`.
- **Querés dejarlo personal y no commitearlo**: lo mismo en `.claude/settings.local.json` y `CLAUDE.local.md`. Agregá `CLAUDE.local.md` al `.gitignore`; con `settings.local.json`, si lo creás a mano, también (Claude Code lo excluye de git por su cuenta solo cuando él crea el archivo).
