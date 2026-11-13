---
objective: 11
title: "Claude Code en CI/CD: -p, salida JSON, permisos y topes de turnos y gasto"
rule: "En CI: `-p` para que no espere a nadie, `--output-format json` para parsear, `--allowedTools` + `dontAsk` para permisos, y `--max-turns` + `--max-budget-usd` para que no se desboque."
sources:
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/permission-modes
    title: "Choose a permission mode"
  - url: https://code.claude.com/docs/en/agent-sdk/agent-loop
    title: "How the agent loop works"
  - url: https://code.claude.com/docs/en/github-actions
    title: "Claude Code GitHub Actions"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
status: verificada
---

## Qué es

En un pipeline no hay nadie mirando la terminal. Entonces Claude Code tiene que:

1. **No esperar a nadie.** Se corre con `-p` (o `--print`): hace el trabajo, imprime y termina.
2. **Devolver algo que un script entienda.** `--output-format json` da un objeto con `result`, `session_id`, `total_cost_usd` y más.
3. **Saber qué puede hacer sin preguntar.** Permisos explícitos.
4. **Tener un freno.** Un tope de turnos y un tope de plata.

## Cuándo se usa

Cada vez que Claude corre solo: un job de GitHub Actions, un hook de git, un cron, un loop en bash.

Los flags que importan:

| Flag | Qué hace | Ojo con |
|---|---|---|
| `-p` / `--print` | Corre no interactivo y sale | Sin esto, `claude "..."` abre una sesión interactiva |
| `--output-format json` | Un objeto JSON al final | `result` solo existe si `subtype` es `success` |
| `--output-format stream-json` | Un evento JSON por línea, en vivo | Con `--verbose` |
| `--max-turns N` | Corta después de N turnos | Sin límite por defecto |
| `--max-budget-usd X` | Corta al llegar a X dólares estimados | Se puede pasar un poco: dejá margen |
| `--allowedTools` | Pre-aprueba herramientas | Usá patrones: `Bash(npm test *)` |
| `--permission-mode dontAsk` | Niega todo lo que hubiera pedido permiso | Ideal para CI cerrado |
| `--bare` | No carga hooks, MCP, plugins ni CLAUDE.md | Mismo resultado en cualquier máquina |

Ojo: `--max-turns` y `--max-budget-usd` son "print mode only". Solo funcionan con `-p`.

## El error típico que el examen quiere que cometas

**Error 1: frenar con texto.** "Pongo en CLAUDE.md: no hagas más de 10 intentos". Eso es una sugerencia. El modelo puede ignorarla. Un tope de turnos o de gasto lo aplica Claude Code mismo. La doc de best practices lo pone en la columna determinística: `--max-turns` o `--max-budget-usd` con `-p`.

**Error 2: "le doy `bypassPermissions` y listo".** Ese modo es para "Isolated containers and VMs only". En un runner compartido, lo correcto es `--allowedTools` con lo justo y `--permission-mode dontAsk`.

**Error 3: leer `.result` sin mirar `subtype`.** Si la corrida pegó contra el tope, el subtype es `error_max_turns` o `error_max_budget_usd`. En esos casos no hay `result`. (Estos subtypes están documentados en la página del agent loop del Agent SDK; `claude -p` es el Agent SDK usado desde la CLI.) Tu script publica "null" como si fuera la respuesta.

**Error 4: creer que el tope de gasto es exacto.** Claude Code compara el gasto *después* de cada respuesta. La respuesta que cruza el tope igual se completa. Por eso la doc dice "leave headroom".

**Error 5: en `-p` sin permisos, "no hizo nada".** Desde Claude Code v2.1.302, una corrida `-p` sin modo de permiso arranca en Manual. Lo que necesita aprobación se **niega** (no queda colgado). La salida trae esas negaciones en `permission_denials`. El fix es aprobar lo justo con `--allowedTools`, no subir turnos.

## Ejemplo

Un job nocturno arregla lint:

```bash
claude -p "Corré el linter y arreglá los errores. Respondé OK o FAIL." \
  --allowedTools "Read,Edit,Bash(npm run lint *)" \
  --permission-mode dontAsk \
  --max-turns 15 \
  --max-budget-usd 3.00 \
  --output-format json > out.json

jq -r '.subtype, .total_cost_usd, .num_turns' out.json
```

- Si `subtype` es `success`, leés `.result`.
- Si es `error_max_turns`, el job falla y alguien mira.
- `total_cost_usd` va a tu dashboard de costos.

En GitHub Actions, los mismos flags van dentro de `claude_args`:

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    prompt: "Arreglá los errores de lint"
    claude_args: "--max-turns 5 --allowedTools Edit,Read"
```

Sumale `timeout-minutes` al job: la doc pide "workflow-level timeouts to avoid runaway jobs". Y la API key va en GitHub Secrets, nunca en el repo.

## Para recordar

- `-p` = no interactivo. Sin `-p`, `claude` abre una sesión interactiva, pensada para una persona en la terminal.
- Los topes (`--max-turns`, `--max-budget-usd`) son **enforcement**. CLAUDE.md es **guidance**.
- Antes de leer `.result`, mirá `.subtype`.
- Permisos en CI: `--allowedTools` justo + `dontAsk`. `bypassPermissions` solo en contenedores descartables.
- En Actions, todo flag del CLI va en `claude_args`.
