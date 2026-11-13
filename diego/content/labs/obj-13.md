---
objective: 13
title: "Lab: una review automática con estándares del repo, herramientas mínimas y salida JSON validada"
minutes: 50
needs: ["Claude Code", "jq", "git", "una carpeta de prueba"]
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

1. Repo de prueba con un estándar y un cambio que lo viola:

   ```bash
   mkdir -p ~/lab-obj13 && cd ~/lab-obj13 && git init -q
   cat > CLAUDE.md <<'EOF'
   # Estándares de review
   - Prohibido loguear datos personales (email, DNI, tarjeta) con console.log.
   - Toda consulta SQL usa parámetros; nunca concatenar strings.
   - No reportes temas de estilo ni formato.
   EOF
   echo "module.exports = {};" > db.js
   git add . && git commit -qm base
   cat > db.js <<'EOF'
   function buscar(db, email) {
     console.log("buscando", email);
     return db.query("SELECT * FROM users WHERE email = '" + email + "'");
   }
   module.exports = { buscar };
   EOF
   ```

2. Guardá el schema de hallazgos en un archivo:

   ```bash
   cat > schema.json <<'EOF'
   {"type":"object",
    "properties":{"findings":{"type":"array","items":{"type":"object",
      "properties":{"file":{"type":"string"},"line":{"type":["integer","null"]},
        "severity":{"type":"string","enum":["high","medium","low"]},
        "rule":{"type":"string"},"issue":{"type":"string"}},
      "required":["file","severity","rule","issue"]}}},
    "required":["findings"]}
   EOF
   ```

3. Primera versión, **la ingenua**: le pedís JSON en el prompt, sin schema.

   ```bash
   git diff | claude -p "Revisá este diff y respondé SOLO un JSON con una lista de findings" \
     --output-format json > naive.json
   jq -r '.result' naive.json | jq '.findings' || echo "NO PARSEA"
   ```

   Corrélo 2 o 3 veces. Fijate si a veces viene con texto o con un bloque de código alrededor. Eso es lo que rompe a un bot.

4. Versión buena: diff por stdin, herramientas mínimas, schema.

   ```bash
   git diff | claude -p "Revisá este diff contra los estándares del CLAUDE.md. Reportá solo violaciones." \
     --tools "Read,Grep,Glob" \
     --output-format json \
     --json-schema "$(cat schema.json)" > review.json
   jq -e 'has("structured_output")' review.json && jq '.structured_output.findings' review.json
   ```

   Esperado: dos hallazgos `high` en `db.js` (el log del email y el SQL concatenado), cada uno con su `rule`.

5. **Rompelo: `--bare`.** Corré lo mismo agregando `--bare` (necesitás `ANTHROPIC_API_KEY`). ¿Sigue citando las reglas del CLAUDE.md? `--bare` saltea el CLAUDE.md. Arreglalo sin sacar `--bare`:

   ```bash
   git diff | claude --bare -p "Revisá este diff contra los estándares. Reportá solo violaciones." \
     --append-system-prompt-file ./CLAUDE.md \
     --tools "Read,Grep,Glob" --output-format json \
     --json-schema "$(cat schema.json)" | jq '.structured_output'
   ```

6. **Rompelo: herramientas.** Corré la review sin `--tools`, pero con este prompt: "Revisá el diff y corregí lo que encuentres". Mirá `permission_denials` y `git diff`. Después repetí con `--tools "Read,Grep,Glob"`. Ahora Claude ni siquiera tiene Edit para intentarlo. Ojo: `--allowedTools "Read"` **no** sirve para esto. Solo pre-aprueba Read; no saca Edit.

7. El gate de CI, en `review.sh`:

   ```bash
   #!/usr/bin/env bash
   git diff | claude -p "Revisá este diff contra los estándares del CLAUDE.md. Reportá solo violaciones." \
     --tools "Read,Grep,Glob" --max-turns 8 \
     --output-format json --json-schema "$(cat schema.json)" > review.json
   if ! jq -e 'has("structured_output")' review.json > /dev/null; then
     echo "Sin salida estructurada (subtype: $(jq -r .subtype review.json))"; exit 2
   fi
   high=$(jq '[.structured_output.findings[] | select(.severity=="high")] | length' review.json)
   jq -r '.structured_output.findings[] | "\(.severity)\t\(.file):\(.line)\t\(.issue)"' review.json
   [ "$high" -eq 0 ] || { echo "$high hallazgos high"; exit 1; }
   ```

   Corrélo con el bug (sale con 1). Arreglá `db.js` (sin log, query parametrizada), corrélo de nuevo y debería salir con 0.

8. Leé el workflow de review de https://code.claude.com/docs/en/github-actions ("Run a skill"). Ubicá en el YAML:
   - qué hace `--comment`;
   - por qué `claude_args` nombra `mcp__github_inline_comment__create_inline_comment`;
   - qué permisos tiene el job (`contents: read`, etc.).

## Cómo sabés que salió bien

- `review.sh` falla con el bug y pasa sin él.
- Explicás por qué el paso 3 es frágil y el 4 no.
- Explicás la diferencia entre `--tools` y `--allowedTools` con tus palabras.
- Sabés que `--bare` no carga el CLAUDE.md y cómo compensarlo.

## Si algo falla

- **`Error: --json-schema is not a valid JSON Schema`:** el JSON del schema está mal. Validalo con `jq . schema.json`.
- **No aparece `structured_output`:** mirá `.subtype`. Si es `error_max_turns`, subí `--max-turns`. Si es `error_max_structured_output_retries`, simplificá el schema.
- **Reporta estilo igual:** reforzá el prompt ("skip style"). La doc avisa que un reviewer al que le piden problemas "will always find something".
- **`--bare` pide credenciales:** exportá `ANTHROPIC_API_KEY`. `--bare` no usa el login de suscripción.
