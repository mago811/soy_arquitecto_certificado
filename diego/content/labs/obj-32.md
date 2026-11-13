---
objective: 32
title: "Lab: diez tareas, cuatro herramientas"
minutes: 40
needs: ["Claude Code", "git"]
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

Antes de que Claude haga nada, vos decidís qué herramienta corresponde (Glob, Grep, Read, Bash, Edit, Write). Después comparás con lo que hizo. Y armás un subagente explorador de solo lectura donde el límite lo pone la config, no el prompt.

## Pasos

### 0. Preparar (5 min)

```bash
mkdir lab-obj32 && cd lab-obj32 && git init -b main
mkdir -p src/components migrations certs/local .claude/agents
echo 'export const Button = () => null;' > src/components/Button.tsx
echo 'test("button", () => {});' > src/components/Button.test.tsx
echo 'export function calculateTax(x: number) { return x * 0.21; }' > src/tax.ts
echo 'import { calculateTax } from "./tax"; export const t = calculateTax(100);' > src/checkout.ts
printf 'paymentsClient: { timeout: 30 }\nsearchClient: { timeout: 30 }\n' > src/config.ts
echo 'var x interface{}' > src/legacy.go
touch migrations/001_init.sql migrations/002_users.sql
echo '-----BEGIN CERTIFICATE-----' > certs/local/dev.pem
echo 'certs/local/' > .gitignore
git add -A && git commit -qm init && git checkout -qb feature
echo '// cambio' >> src/checkout.ts && git commit -qam cambio
```

### 1. El subagente explorador (5 min)

Creá `.claude/agents/explorer.md`:

```markdown
---
name: explorer
description: Busca y lee código para responder preguntas sobre el repo. No edita ni ejecuta comandos.
tools: Read, Grep, Glob
---
Usá Glob para encontrar archivos por nombre, Grep para buscar contenido y Read solo para los archivos necesarios.
Devolvé rutas y líneas exactas.
```

Como deja afuera Bash y lista Grep y Glob, esas dos tools vuelven para este subagente aunque estés en Linux o macOS. Arrancá `claude`.

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

Respuestas esperadas: 1 Glob · 2 Grep · 3 Grep con `interface\{\}` · 4 Glob (no respeta `.gitignore` por defecto) · 5 `ls` por Bash (Read no lee carpetas) · 6 Bash con `git diff --name-only main...HEAD` · 7 Read · 8 Edit con `old_string` que incluya `paymentsClient` · 9 el explorer no puede: no tiene Bash · 10 Write.

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

- El subagente no aparece: la carpeta `.claude/agents/` tiene que existir; reiniciá `claude` si la creaste con la sesión abierta.
- Claude no usa el subagente: nombralo explícitamente ("usá el subagente explorer").
- La tarea 6 da vacío: confirmá que estás en la rama `feature` con `git branch`.
