---
objective: 30
title: "Lab: el review que se queja de todo, domado con CLAUDE.md"
minutes: 40
needs: ["Claude Code", "git", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/code-review-local
    title: "Review locally with /code-review"
  - url: https://code.claude.com/docs/en/code-review-customize
    title: "Customize Code Review"
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically (bare mode)"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
status: verificada
---

## Objetivo

Ver con tus ojos que un review sin contexto marca como "problema" cosas que tu equipo acepta, y que se arregla con **contexto persistente** (`CLAUDE.md`), no con aclaraciones en cada corrida. De paso, comprobar que `/code-review` local **no** lee `REVIEW.md` y que `--bare` se saltea `CLAUDE.md`.

## Pasos

### 0. Repo de juguete (5 min)

```bash
mkdir lab-obj30 && cd lab-obj30 && git init
mkdir -p src/gen src/billing
cat > src/billing/montos.ts <<'TS'
// Convención del equipo: montos en centavos, como enteros.
export function total(itemsCentavos: number[]): number {
  return itemsCentavos.reduce((a, b) => a + b, 0);
}
TS
cat > src/gen/cliente_api.ts <<'TS'
// ARCHIVO GENERADO. No editar a mano.
export const x=1;export const y = 2 ;var z=  3
TS
git add . && git commit -m "base"
```

Ahora un cambio con un bug real y cosas que el equipo acepta:

```bash
cat > src/billing/montos.ts <<'TS'
// Convención del equipo: montos en centavos, como enteros.
export function total(itemsCentavos: number[]): number {
  return itemsCentavos.reduce((a, b) => a + b, 0);
}
export function conIva(centavos: number): number {
  return centavos * 21 / 100; // bug: devuelve solo el IVA, no el total con IVA
}
TS
echo 'var w=4' >> src/gen/cliente_api.ts
```

### 1. Review sin contexto (8 min)

Arrancá `claude` en la carpeta y corré:

```text
/code-review
```

Anotá cada hallazgo en una tabla: ¿es el bug real de `conIva`? ¿Es sobre `src/gen/`? ¿Sugiere usar decimales en vez de centavos?

### 2. Contexto persistente en `CLAUDE.md` (8 min)

Creá `CLAUDE.md` en la raíz:

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

Salí de la sesión. Probá desde la shell (con `ANTHROPIC_API_KEY` seteada, porque bare mode no usa tu login):

```bash
claude --bare -p "Revisá el diff de git (git diff) y listá problemas" --allowedTools "Read,Bash(git diff *)"
```

¿Volvió a sugerir decimales o a mirar `src/gen/`? Ahora pasale las reglas por flag:

```bash
claude --bare -p "Revisá el diff de git (git diff) y listá problemas" \
  --allowedTools "Read,Bash(git diff *)" \
  --append-system-prompt-file CLAUDE.md
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
- **`--bare` pide credenciales**: bare mode no usa tu login de claude.ai; exportá `ANTHROPIC_API_KEY`.
- **Tu versión de Claude Code no tiene `/code-review`**: actualizá Claude Code. Antes de v2.1.147 el comando se llamaba `/simplify` y aplicaba los fixes por defecto.
