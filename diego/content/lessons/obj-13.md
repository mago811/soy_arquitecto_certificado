---
objective: 13
title: "Reviews automáticas: estándares correctos, herramientas mínimas y salida que un bot pueda leer"
rule: "Estándares en el CLAUDE.md del repo; herramientas mínimas con `--tools`/`--disallowedTools`; y `--output-format json` + `--json-schema` para leer `structured_output`, chequeando que exista."
sources:
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/github-actions
    title: "Claude Code GitHub Actions"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/code-review
    title: "Code Review"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
status: verificada
---

## Qué es

Una review automática tiene tres partes. Si falla una, falla todo:

1. **Con qué reglas revisa** (los estándares del equipo).
2. **Qué puede tocar** (herramientas).
3. **Qué entrega** (un formato que otro programa pueda procesar).

## Cuándo se usa

En cada PR, en un job de CI o con la GitHub Action. El resultado lo lee un bot: comenta en el PR, abre tickets o falla el build.

### 1. Estándares: el CLAUDE.md del repo

La doc de GitHub Actions dice: creá un `CLAUDE.md` en la raíz del repo con guías de estilo, criterios de review y reglas del proyecto. Va en git, así el runner lo tiene.

| Dónde | ¿Lo ve el runner de CI? |
|---|---|
| `./CLAUDE.md` o `./.claude/CLAUDE.md` (proyecto) | Sí, viene con el checkout |
| `$HOME\.claude\CLAUDE.md` (tu usuario) | No, vive en tu máquina |

**Trampa:** `--bare` saltea los `CLAUDE.md` "from the repo and your home directory" (el del repo y el de tu usuario). Si usás `--bare`, pasá los estándares con `--append-system-prompt-file`.

**Code Review gestionado** (el servicio de Anthropic) también lee `REVIEW.md`. Lo lee de la rama base, nunca de los cambios del PR.

### 2. Herramientas: lo mínimo

| Flag | Qué hace |
|---|---|
| `--tools "Read,Grep,Glob"` | Restringe qué herramientas built-in **existen** |
| `--disallowedTools "Edit"` | Saca Edit del contexto de Claude |
| `--allowedTools "..."` | Pre-aprueba herramientas. **No** restringe |

Esta es la confusión clásica: `--allowedTools` no es una lista blanca. La doc lo dice: "To restrict which tools are available, use `--tools` instead."

Otro truco: **pasale el diff por stdin** (`git diff main | claude -p ...`). Así Claude no necesita una shell para leerlo. Y si la necesita, acotala en las dos tools de shell que tiene en Windows: `Bash(git diff *)` y `PowerShell(git diff *)`. El espacio antes del `*` importa. Sin el espacio, `Bash(git diff*)` también matchea `git diff-index`.

### 3. Salida: JSON validado

- `--output-format json`: un objeto con metadata. El texto libre de la review va en `result`.
- `--output-format json --json-schema '<schema>'`: la salida validada contra tu schema va en `structured_output`.

Si la corrida termina sin una salida válida, por ejemplo porque Claude se negó, **no hay `structured_output`**. Tu script tiene que chequear que el campo exista.

## El error típico que el examen quiere que cometas

- **"Le pido en el prompt que responda solo en JSON."** Eso es guidance. Si cambia una coma, el parser se rompe. El fix es `--json-schema`.
- **"Le pongo `--allowedTools Read` para que sea de solo lectura."** No: eso aprueba Read, no saca Edit. Para restringir: `--tools` o `--disallowedTools`.
- **"Reemplazo el system prompt con `--system-prompt` para darle rol de reviewer."** Perdés el comportamiento por defecto de Claude Code. Para sumar un rol: `--append-system-prompt`.
- **"Los estándares están en mi `$HOME\.claude\CLAUDE.md`."** El runner no los ve.
- **"Que la review se apruebe sola y mergee."** Code Review "never approves or blocks the pull request". El merge lo decide una persona o la protección de rama.

## Ejemplo

En PowerShell:

```powershell
$schema = '{"type":"object","properties":{"findings":{"type":"array","items":{"type":"object","properties":{"file":{"type":"string"},"line":{"type":"integer"},"severity":{"type":"string","enum":["high","medium","low"]},"issue":{"type":"string"}},"required":["file","severity","issue"]}}},"required":["findings"]}' -replace '"', '\"'

$review = git diff main | claude -p "Revisá este diff." --append-system-prompt "Sos reviewer de seguridad. Seguí los criterios del CLAUDE.md." --tools "Read,Grep,Glob" --output-format json --json-schema $schema | ConvertFrom-Json

if ($review.PSObject.Properties.Name -notcontains 'structured_output') { Write-Host "sin salida estructurada"; exit 1 }
$review.structured_output.findings | Where-Object { $_.severity -eq 'high' }
```

El `-replace` escapa las comillas del JSON: Windows PowerShell 5.1 se las come al pasarle un argumento a un programa. (En PowerShell 7.3 o más nuevo no hace falta y lo rompería: ahí sacalo.)

En GitHub Actions, con el plugin `code-review`:

- `--comment` en el prompt hace que publique en el PR. Sin `--comment`, todo queda en el log del workflow.
- `claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment"'` hace falta para los comentarios inline. La Action solo levanta ese servidor MCP si `--allowedTools` lo nombra.

## Para recordar

- Estándares → `CLAUDE.md` del repo (en git). Con `--bare` no se carga.
- Restringir → `--tools` / `--disallowedTools`. Pre-aprobar → `--allowedTools`.
- Bot que parsea → `--output-format json --json-schema` y leés `structured_output`. Antes, chequeá que exista.
- Rol de reviewer sin perder lo default → `--append-system-prompt`.
