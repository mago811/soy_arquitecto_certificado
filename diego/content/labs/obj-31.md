---
objective: 31
title: "Lab (repaso): de 'reportá lo importante' a límites explícitos"
minutes: 30
needs: ["Claude Code en Windows", "PowerShell", "Git for Windows", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code (Review against your spec)"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/code-review-customize
    title: "Customize Code Review (Choose what to write in REVIEW.md)"
status: verificada
---

## Objetivo

Correr el mismo review con tres criterios (vago, "sé conservador" y límites explícitos) sobre un diff con 2 bugs reales y bastante ruido de estilo. Contar bugs encontrados y ruido en cada caso.

## Pasos

1. Preparar (5 min). En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj31
Set-Location lab-obj31
git init
New-Item -ItemType Directory -Force .claude\agents
code pagos.py
```

(Si no usás VS Code, cambiá `code` por `notepad`.) Pegá esta versión base en `pagos.py` y guardá:

```python
def total(items):
    return sum(i["precio"] * i["cant"] for i in items)
```

Commiteala:

```powershell
git add .
git commit -m base
```

Ahora volvé a abrir `pagos.py` (`code pagos.py`), **reemplazá todo** por esta versión y guardá. No la commitees: es el diff a revisar.

```python
import logging
def total(items, Descuento=0):
    T = sum(i["precio"] * i["cant"] for i in items)
    logging.info("total para %s", items[0]["email"])   # bug 1: PII en logs
    return T - T*Descuento if Descuento<1 else T       # bug 2: descuento >= 1 se ignora en silencio
def x(a,b): return a+b
```

Chequeá con `git diff` que se ve el cambio.

2. Creá el subagente con `code .claude\agents\revisor.md`, pegá esto y reiniciá `claude` (si la carpeta `agents` es nueva, hace falta reiniciar para que la cargue):

```markdown
---
name: revisor
description: Revisa el diff de git del repo. Usar cuando el usuario pide un review.
tools: Read, Grep, Glob, Bash, PowerShell
---
Revisá el diff (`git diff`) y reportá lo importante.
```

3. Ronda A (vago): `Usá el subagente revisor sobre el diff.` Anotá: ¿encontró los 2 bugs? ¿Cuántos comentarios de estilo/naming (`Descuento`, `T`, `x`)?

4. Ronda B ("sé conservador"): cambiá la última línea del subagente a `Revisá el diff y sé conservador: reportá solo lo de severidad alta.` Repetí (Claude Code detecta en unos segundos los cambios a un archivo de subagente, sin reiniciar). Anotá lo mismo.

5. Ronda C (límites explícitos): reemplazá el cuerpo por:

```text
Revisá el diff (`git diff`).
Reportá SOLO: bugs que cambian el resultado o lo ocultan, y datos personales en logs.
NO reportes: estilo, nombres, formato, refactors, tests faltantes.
Para cada hallazgo citá archivo:línea. Si no podés citarlo, no lo reportes.
```

Repetí y anotá.

| Ronda | Bugs encontrados (de 2) | Comentarios de ruido |
|---|---|---|
| A vago | | |
| B conservador | | |
| C explícito | | |

## Cómo sabés que salió bien

- C encuentra los 2 bugs con `archivo:línea` y casi sin ruido.
- A trae ruido de estilo; B puede perder alguno de los bugs (si el modelo lo considera "medio").

## Si algo falla

- **El subagente no aparece**: revisá el frontmatter (`name` y `description` son obligatorios) y reiniciá la sesión.
- **Rondas iguales**: el modelo varía entre corridas; repetí cada ronda dos veces antes de sacar conclusiones.
- **Pide permiso para `git diff`**: aceptalo o agregá las dos reglas a `permissions.allow` en `.claude\settings.local.json` (creala con `code .claude\settings.local.json`): `Bash(git diff *)` y `PowerShell(git diff *)`. En Windows Claude puede correr `git diff` por la tool `Bash` (Git Bash) o por la tool `PowerShell`, y cada una tiene sus propias reglas.

```json
{
  "permissions": {
    "allow": ["Bash(git diff *)", "PowerShell(git diff *)"]
  }
}
```

- **`git commit` falla con "Please tell me who you are"**: configurá tu identidad una vez con `git config --global user.name "Diego"` y `git config --global user.email "diego@example.com"`.
