---
objective: 5
title: "Lab: un reviewer que no puede editar y un test-runner que no puede pushear"
minutes: 35
needs: ["Claude Code", "un repo de prueba con git"]
sources:
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
status: verificada
---

## Objetivo

Comprobar que el rol de un subagente se **garantiza** con `tools`/`disallowedTools` y `permissions.deny`, no con frases en el prompt; y que el subagente solo sabe lo que le pasás al delegar.

## Pasos

1. Repo de prueba:

```bash
mkdir -p ~/lab-roles && cd ~/lab-roles && git init
mkdir -p .claude/agents src
printf 'export function suma(a, b) {\n  return a - b; // bug\n}\n' > src/suma.js
git add . && git commit -m init
```

2. Reviewer **mal** configurado — `.claude/agents/reviewer.md`:

```markdown
---
name: reviewer
description: Revisa código. NUNCA modifica archivos.
---
Revisá el código que te indiquen y corregí lo que encuentres.
```

3. En Claude Code: `@"reviewer (agent)" revisá src/suma.js`. Mirá si edita el archivo (`git diff`). Si editó, `git checkout .`.

4. Reviewer **bien** configurado:

```markdown
---
name: reviewer
description: Revisa código. Usar después de cada cambio.
tools: Read, Grep, Glob
---
Sos revisor. Devolvé una lista de hallazgos con archivo y línea. No escribís parches.
```

Repetí el paso 3. Ahora no puede editar: Edit y Write no existen en su sesión.

5. Test-runner — `.claude/agents/tester.md`, primera versión:

```markdown
---
name: tester
description: Corre tests y reporta fallas.
disallowedTools: Bash(git push *)
---
Corré los tests y reportá.
```

Pedile: `@"tester (agent)" corré "node -e \"require('./src/suma.js')\""`. Observá: no tiene Bash (el especificador sacó la tool entera).

6. Versión correcta: borrá `disallowedTools` del tester y creá `.claude/settings.json`:

```json
{
  "permissions": {
    "deny": ["Bash(git push *)"]
  }
}
```

Repetí: ahora corre comandos, pero un `git push` queda denegado (en la sesión principal y en los subagentes).

7. Contexto: en la conversación principal decí "el bug está en la línea 2, es un signo". Después pedí a Claude: "delegale al reviewer que confirme el bug que te conté, sin repetirle el detalle". Compará con: "delegale al reviewer: confirmá que en src/suma.js línea 2 se usa `-` en vez de `+`".

## Cómo sabés que salió bien

- Paso 3: el reviewer sin `tools` puede editar (hereda todo). La frase en `description` no lo frena.
- Paso 4: con `tools: Read, Grep, Glob` no hay edición posible.
- Paso 5: el tester se queda sin Bash.
- Paso 6: el tester corre Bash y el push se deniega.
- Paso 7: la delegación con ruta, línea y síntoma da una respuesta precisa; la vaga depende de lo que Claude haya decidido copiar al prompt.

## Si algo falla

- Si el subagente nuevo no aparece en el typeahead `@`: si `.claude/agents/` no existía al abrir la sesión, reiniciá Claude Code.
- Si el archivo no carga, revisá que tenga `name` y `description` y que el `---` sea la primera línea.
