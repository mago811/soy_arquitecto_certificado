---
objective: 11
title: "Lab: un job de CI con claude -p, salida JSON, permisos y topes"
minutes: 45
needs: ["Claude Code", "jq", "una carpeta de prueba con git", "unos centavos de crédito de API o tu suscripción"]
sources:
  - url: https://code.claude.com/docs/en/headless
    title: "Run Claude Code programmatically"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/agent-sdk/agent-loop
    title: "How the agent loop works"
  - url: https://code.claude.com/docs/en/permission-modes
    title: "Choose a permission mode"
status: verificada
---

## Objetivo

Armar a mano lo que haría un pipeline:

1. Correr Claude sin interacción.
2. Leer el resultado con `jq`.
3. Ver qué pasa cuando faltan permisos.
4. Ver qué pasa cuando se pega contra el tope de turnos y el de gasto.

Al final vas a tener un script que falla el "build" cuando algo sale mal.

## Pasos

1. Armá la carpeta de prueba con un bug chico:

   ```bash
   mkdir -p ~/lab-obj11 && cd ~/lab-obj11 && git init -q
   cat > suma.js <<'EOF'
   function suma(a, b) { return a - b; }
   module.exports = suma;
   EOF
   cat > test.js <<'EOF'
   const suma = require('./suma');
   if (suma(2, 3) !== 5) { console.error('FAIL'); process.exit(1); }
   console.log('OK');
   EOF
   git add . && git commit -qm init
   ```

2. Primera corrida no interactiva, solo lectura, con salida JSON:

   ```bash
   claude -p "¿Qué hace suma.js? Una frase." --output-format json > r1.json
   jq 'keys' r1.json
   jq -r '.subtype, .result, .total_cost_usd, .num_turns, .session_id' r1.json
   ```

   Mirá las claves. Tienen que aparecer `result`, `session_id` y `total_cost_usd`. Anotá el `subtype`: debería ser `success`.

3. **Rompelo: sin permisos.** Pedile que arregle el bug sin aprobar nada:

   ```bash
   claude -p "Arreglá suma.js para que node test.js imprima OK" --output-format json > r2.json
   jq '.subtype, .permission_denials' r2.json
   git diff --stat
   ```

   Según la doc, en un `-p` en modo Manual "a call that needs approval is denied". Lo esperable: `git diff` vacío y algo en `permission_denials`. (Antes de v2.1.302, una corrida `-p` podía arrancar en auto mode: si tu versión es vieja, anotá lo que veas. Para eso es el lab.)

4. **Arreglalo con permisos justos + dontAsk:**

   ```bash
   claude -p "Arreglá suma.js para que node test.js imprima OK. Respondé OK o FAIL." \
     --allowedTools "Read,Edit,Bash(node test.js)" \
     --permission-mode dontAsk \
     --output-format json > r3.json
   jq -r '.subtype, .result, .num_turns, .total_cost_usd' r3.json
   node test.js
   git checkout suma.js   # volvé al estado roto para el paso siguiente
   ```

5. **Rompelo: tope de turnos demasiado bajo.**

   ```bash
   claude -p "Arreglá suma.js y corré node test.js para confirmar" \
     --allowedTools "Read,Edit,Bash(node test.js)" --permission-mode dontAsk \
     --max-turns 1 --output-format json > r4.json
   echo "exit code: $?"
   jq '{subtype, has_result: has("result"), num_turns, total_cost_usd}' r4.json
   ```

   Esperado: `subtype` = `error_max_turns` y sin `result`. Anotá también el exit code (la doc dice que es distinto de 0 "when the run fails"; fijate qué hace tu versión con un tope de turnos). La doc del agent loop explica que cada turno con tool calls cuenta, "plus one for the final text-only response".

6. **Rompelo: tope de gasto mínimo.**

   ```bash
   git checkout suma.js
   claude -p "Explicá en detalle cada archivo del repo y después arreglá el bug" \
     --allowedTools "Read,Edit" --permission-mode dontAsk \
     --max-budget-usd 0.01 --output-format json > r5.json
   jq '{subtype, total_cost_usd}' r5.json
   ```

   Esperado: `error_max_budget_usd`. Fijate si `total_cost_usd` quedó **arriba** de 0.01. La doc avisa: "Spend can pass the cap, so leave headroom."

7. **El script de CI.** Guardalo como `ci.sh`:

   ```bash
   #!/usr/bin/env bash
   set -u
   git checkout -q suma.js
   claude -p "Arreglá suma.js para que node test.js imprima OK. Respondé OK o FAIL." \
     --allowedTools "Read,Edit,Bash(node test.js)" \
     --permission-mode dontAsk \
     --max-turns 10 --max-budget-usd 1.00 \
     --output-format json > out.json
   code=$?
   subtype=$(jq -r '.subtype' out.json)
   echo "exit=$code subtype=$subtype costo=$(jq -r '.total_cost_usd' out.json)"
   if [ "$subtype" != "success" ]; then echo "Claude no terminó: $subtype"; exit 1; fi
   jq -r '.result' out.json
   node test.js || exit 1
   ```

   Corré `bash ci.sh`. Después cambiá `--max-turns 10` por `--max-turns 1` y confirmá que el script falla con un mensaje claro, sin imprimir "null".

8. **Bonus (`--bare`).** Si tenés API key, probá `ANTHROPIC_API_KEY=... claude --bare -p "¿Qué hace suma.js?" --allowedTools "Read" --output-format json | jq -r .result`. `--bare` no carga tus hooks, MCP ni CLAUDE.md, y no usa el login de suscripción.

## Cómo sabés que salió bien

- Explicás sin mirar por qué el paso 3 no editó nada y qué flag lo arregló.
- En el paso 5 viste `error_max_turns`, y en el 6, `error_max_budget_usd`.
- `ci.sh` sale con 0 cuando todo anda y con 1 cuando pega contra un tope (lo decide el chequeo de `subtype`, no el exit code de `claude`). Nunca imprime "null".
- Sabés de dónde sale el costo de cada corrida (`total_cost_usd`).

## Si algo falla

- **`jq: command not found`:** instalá jq (`brew install jq` / `sudo apt install jq`).
- **Pide login o falla la autenticación:** corré `claude` una vez en modo interactivo para loguearte. Con `--bare` necesitás `ANTHROPIC_API_KEY` sí o sí.
- **El paso 3 sí editó:** puede que tengas reglas `permissions.allow` en tu `~/.claude/settings.json` o en el proyecto. Revisalas con `/permissions` en una sesión interactiva, o repetí con `--bare`.
- **Tu versión no reconoce `--max-budget-usd`:** tu Claude Code es viejo. Actualizalo (`claude update`).
- **El paso 5 terminó en `success`:** el modelo lo resolvió sin herramientas. Pedile algo que obligue a usar varias (leer, editar y correr el test).
