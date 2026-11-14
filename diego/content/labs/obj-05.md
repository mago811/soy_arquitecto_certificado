---
objective: 5
title: "Lab: un reviewer que no puede editar y un test-runner que no puede pushear"
minutes: 35
needs: ["Claude Code en Windows (PowerShell)", "Git for Windows", "un repo de prueba con git"]
sources:
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
status: verificada
---

## Objetivo

Comprobar que el rol de un subagente se **garantiza** con `tools`/`disallowedTools` y `permissions.deny`, no con frases en el prompt; y que el subagente solo sabe lo que le pasás al delegar.

## Pasos

1. Repo de prueba. En PowerShell:

```powershell
New-Item -ItemType Directory -Force $HOME\lab-roles
Set-Location $HOME\lab-roles
git init
New-Item -ItemType Directory -Force .claude\agents, src
code src\suma.js
```

(Si no usás VS Code, cambiá `code` por `notepad`.) Pegá en `src\suma.js` y guardá:

```javascript
export function suma(a, b) {
  return a - b; // bug
}
```

Commiteá:

```powershell
git add .
git commit -m init
```

2. Reviewer **mal** configurado — creá `.claude\agents\reviewer.md` con `code .claude\agents\reviewer.md`:

```markdown
---
name: reviewer
description: Revisa código. NUNCA modifica archivos.
---
Revisá el código que te indiquen y corregí lo que encuentres.
```

3. En Claude Code: `@"reviewer (agent)" revisá src/suma.js`. Mirá si edita el archivo: en PowerShell corré `git diff`. Si editó, volvé atrás con `git checkout .`.

4. Reviewer **bien** configurado (reemplazá todo el contenido de `.claude\agents\reviewer.md`):

```markdown
---
name: reviewer
description: Revisa código. Usar después de cada cambio.
tools: Read, Grep, Glob
---
Sos revisor. Devolvé una lista de hallazgos con archivo y línea. No escribís parches.
```

Repetí el paso 3. Ahora no puede editar: Edit y Write no existen en su sesión.

5. Test-runner — creá `.claude\agents\tester.md`, primera versión:

```markdown
---
name: tester
description: Corre tests y reporta fallas.
disallowedTools: Bash(git push *), PowerShell(git push *)
---
Corré los tests y reportá.
```

Pedile: `@"tester (agent)" corré git status y git log --oneline`. Observá: no tiene ni `Bash` ni `PowerShell`. Cada entrada con especificador sacó la tool **entera**, no solo `git push`.

Por qué las dos: en Windows con Git for Windows, Claude Code tiene la tool `Bash` (Git Bash) y la tool `PowerShell`. Si solo sacás `Bash`, el subagente sigue corriendo comandos por `PowerShell`.

6. Versión correcta: borrá la línea `disallowedTools` del tester y creá `.claude\settings.json` con el editor (`code .claude\settings.json`; no lo escribas con `Set-Content`, que en PowerShell 5.1 puede meter BOM y romper el JSON):

```json
{
  "permissions": {
    "deny": ["Bash(git push *)", "PowerShell(git push *)"]
  }
}
```

Reiniciá `claude` y repetí con `@"tester (agent)" corré git status y después git push origin main`: ahora corre comandos, pero el `git push` queda denegado (en la sesión principal y en los subagentes), lo intente por `Bash` o por `PowerShell`. La regla `PowerShell(...)` hace falta: una regla `Bash(...)` no restringe la tool `PowerShell`.

7. Contexto: en la conversación principal decí "el bug está en la línea 2, es un signo". Después pedí a Claude: "delegale al reviewer que confirme el bug que te conté, sin repetirle el detalle". Compará con: "delegale al reviewer: confirmá que en src/suma.js línea 2 se usa `-` en vez de `+`".

## Cómo sabés que salió bien

- Paso 3: el reviewer sin `tools` puede editar (hereda todo). La frase en `description` no lo frena.
- Paso 4: con `tools: Read, Grep, Glob` no hay edición posible.
- Paso 5: el tester se queda sin `Bash` y sin `PowerShell`: no puede correr ningún comando.
- Paso 6: el tester corre `git status` y el push se deniega.
- Paso 7: la delegación con ruta, línea y síntoma da una respuesta precisa; la vaga depende de lo que Claude haya decidido copiar al prompt.

## Si algo falla

- Si el subagente nuevo no aparece en el typeahead `@`: si `.claude\agents\` no existía al abrir la sesión, reiniciá Claude Code.
- Si en el paso 5 el tester igual corre comandos: revisá que `disallowedTools` tenga las dos entradas (`Bash(...)` y `PowerShell(...)`) separadas por coma.
- Si `git commit` falla con "Please tell me who you are": `git config --global user.name "Diego"` y `git config --global user.email "diego@example.com"`.
- Si el archivo no carga, revisá que tenga `name` y `description` y que el `---` sea la primera línea.
