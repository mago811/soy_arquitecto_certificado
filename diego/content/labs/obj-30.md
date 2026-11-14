---
objective: 30
title: "Lab: el review que se queja de todo, domado con CLAUDE.md"
minutes: 40
needs: ["Claude Code en Windows", "PowerShell", "Git for Windows", "API key de Anthropic (paso 4)"]
sources:
  - url: https://code.claude.com/docs/en/code-review-local
    title: "Review locally with /code-review"
  - url: https://code.claude.com/docs/en/code-review-customize
    title: "Customize Code Review"
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically (bare mode)"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/permissions
    title: "Configure permissions (PowerShell rules)"
status: verificada
---

## Objetivo

Ver con tus ojos que un review sin contexto marca como "problema" cosas que tu equipo acepta, y que se arregla con **contexto persistente** (`CLAUDE.md`), no con aclaraciones en cada corrida. De paso, comprobar que `/code-review` local **no** lee `REVIEW.md` y que `--bare` se saltea `CLAUDE.md`.

## Pasos

### 0. Repo de juguete (5 min)

En PowerShell (los archivos con `Set-Content -Encoding utf8`; en PowerShell 5.1, `>` escribe UTF-16):

```powershell
New-Item -ItemType Directory lab-obj30 | Out-Null
Set-Location lab-obj30
git init
New-Item -ItemType Directory -Force src\gen, src\billing | Out-Null
Set-Content -Encoding utf8 -Path src\billing\montos.ts -Value @'
// Convención del equipo: montos en centavos, como enteros.
export function total(itemsCentavos: number[]): number {
  return itemsCentavos.reduce((a, b) => a + b, 0);
}
'@
Set-Content -Encoding utf8 -Path src\gen\cliente_api.ts -Value @'
// ARCHIVO GENERADO. No editar a mano.
export const x=1;export const y = 2 ;var z=  3
'@
git add .
git commit -m "base"
```

El `'@` de cierre va pegado al margen izquierdo. Ahora un cambio con un bug real y cosas que el equipo acepta (sin commitear):

```powershell
Set-Content -Encoding utf8 -Path src\billing\montos.ts -Value @'
// Convención del equipo: montos en centavos, como enteros.
export function total(itemsCentavos: number[]): number {
  return itemsCentavos.reduce((a, b) => a + b, 0);
}
export function conIva(centavos: number): number {
  return centavos * 21 / 100; // bug: devuelve solo el IVA, no el total con IVA
}
'@
Add-Content -Encoding ascii -Path src\gen\cliente_api.ts -Value 'var w=4'
git status --short
```

`git status --short` tiene que mostrar los dos archivos con ` M`.

### 1. Review sin contexto (8 min)

Arrancá `claude` en la carpeta y corré:

```text
/code-review
```

Anotá cada hallazgo en una tabla: ¿es el bug real de `conIva`? ¿Es sobre `src/gen/`? ¿Sugiere usar decimales en vez de centavos?

### 2. Contexto persistente en `CLAUDE.md` (8 min)

Creá `CLAUDE.md` en la raíz con el editor (`code CLAUDE.md` o `notepad CLAUDE.md`) y pegá:

```markdown
# Convenciones de review
- Los montos se manejan en centavos como enteros (number). Es el patrón aceptado: no sugerir decimales ni librerías de dinero.
- `src/gen/` es código generado: no reportar nada ahí.
- No reportar formato ni estilo: lo chequea el linter en CI.
```

Corré de nuevo `/code-review` (en la misma sesión o en una nueva). Compará la tabla. El bug de `conIva` tiene que seguir apareciendo; lo de `src/gen/` y lo de decimales, no.

> La doc: "the review follows your `CLAUDE.md`, including in a non-interactive `-p` run."

### 3. `REVIEW.md` no le llega al comando local (5 min)

Mové las dos últimas viñetas a un `REVIEW.md` en la raíz y sacalas de `CLAUDE.md`. Corré `/code-review` otra vez.
¿Volvieron los comentarios sobre `src/gen/` o estilo? Es lo esperable: el comando local "doesn't read `REVIEW.md`". `REVIEW.md` lo lee el **servicio** Code Review en GitHub (planes Team/Enterprise). Volvé a poner las viñetas en `CLAUDE.md`.

### 4. `--bare` se saltea `CLAUDE.md` (8 min)

Salí de la sesión (`/exit`). Bare mode no usa tu login de claude.ai: necesita la API key en la ventana de PowerShell. Guardá el prompt en una variable para no repetirlo:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$p = "Revisá el diff de git (git diff) y listá problemas"
claude --bare -p $p --allowedTools "Read,Bash(git diff *),PowerShell(git diff *)"
```

Van las dos reglas porque cada tool de shell tiene sus propias reglas de permiso: una regla `Bash(...)` no cubre la tool `PowerShell`. La doc dice que en bare mode Claude tiene las tools de shell y de archivos; si tu versión solo carga `Bash` (Git Bash), la regla `PowerShell(...)` no hace nada y no molesta. Con las dos, el comando anda cargue la que cargue.

¿Volvió a sugerir decimales o a mirar `src/gen/`? Ahora pasale las reglas por flag:

```powershell
claude --bare -p $p --allowedTools "Read,Bash(git diff *),PowerShell(git diff *)" --append-system-prompt-file CLAUDE.md
```

### 5. Menos ruido, sin perder el bug (6 min)

Opcional: `/code-review low`. La doc: "At `low`, the review reports the findings it's most confident in, so you see fewer false positives." Compará: ¿siguió apareciendo el bug de `conIva`? Ojo: `low` baja ruido en general; las convenciones siguen yendo en `CLAUDE.md`.

## Cómo sabés que salió bien

- Paso 1: aparece el bug de `conIva` **y** comentarios de ruido (generados, estilo, decimales).
- Paso 2: con `CLAUDE.md`, desaparece el ruido y sigue el bug.
- Paso 3: con las reglas solo en `REVIEW.md`, el comando local vuelve a mostrar ruido.
- Paso 4: `--bare` sin flag ignora `CLAUDE.md`; con `--append-system-prompt-file` vuelve a respetarlo.

## Si algo falla

- **`/code-review` no encuentra cambios**: con el repo sin upstream compara contra `main` o el commit anterior. Asegurate de que el cambio del paso 0 esté sin commitear.
- **El ruido no desaparece del todo**: el modelo puede variar entre corridas. Escribí la regla más concreta ("no reportar nada en `src/gen/`") en vez de vaga ("ignorá lo irrelevante").
- **`--bare` pide credenciales**: bare mode no usa tu login de claude.ai. Seteá `$env:ANTHROPIC_API_KEY = "sk-ant-..."` en la misma ventana de PowerShell donde corrés `claude` (si abriste otra ventana, la variable no está: comprobalo con `$env:ANTHROPIC_API_KEY`).
- **En el paso 4 Claude se queda esperando permiso o dice que no puede correr `git diff`**: revisá que el valor de `--allowedTools` esté entre comillas dobles, entero, con `Bash(git diff *)` y `PowerShell(git diff *)`.
- **Tu versión de Claude Code no tiene `/code-review`**: actualizá Claude Code. Antes de v2.1.147 el comando se llamaba `/simplify` y aplicaba los fixes por defecto.
