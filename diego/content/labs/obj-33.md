---
objective: 33
title: "Lab: tres subagentes, tres sets de tools"
minutes: 45
needs: ["Claude Code", "git", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/agent-sdk/subagents
    title: "Subagents in the SDK"
  - url: https://code.claude.com/docs/en/permissions
    title: "Configure permissions"
status: verificada
---

## Objetivo

Crear tres subagentes de proyecto con sets de tools distintos, comprobar que un subagente **no puede** usar una tool que no tiene (aunque se lo pidas), y ver la diferencia entre `tools`, `disallowedTools` y una regla de `permissions.deny`.

## Pasos

### 1. Proyecto de juguete (5 min)

```bash
mkdir lab-obj33 && cd lab-obj33 && git init
mkdir -p src .claude/agents
printf 'def suma(a, b):\n    return a - b  # bug\n' > src/calc.py
```

### 2. Tres subagentes (10 min)

`.claude/agents/code-analyst.md`:

```markdown
---
name: code-analyst
description: Analiza código del repo sin modificarlo. Usar para encontrar bugs o explicar código.
tools: Read, Grep, Glob
---
Sos un analista. Reportá hallazgos con ruta y línea. Nunca modificás archivos.
```

`.claude/agents/fixer.md`:

```markdown
---
name: fixer
description: Aplica correcciones puntuales en el código cuando ya se sabe qué cambiar.
tools: Read, Edit, Grep, Glob
---
Aplicá exactamente el cambio pedido y nada más.
```

`.claude/agents/test-runner.md`:

```markdown
---
name: test-runner
description: Corre comandos de prueba y resume el resultado. No edita archivos.
disallowedTools: Write, Edit
---
Corré lo que te pidan y resumí la salida.
```

Abrí Claude Code en la carpeta (si ya estaba abierto, reinicialo para que lea `.claude/agents/`):

```bash
claude
```

### 3. Probar el límite del rol (10 min)

```text
Usá el subagente code-analyst para encontrar el bug en src/calc.py y arreglarlo directamente.
```

Mirá la transcripción: el analista encuentra el bug pero **no puede** editar, porque `Edit` no está en su set. La doc del SDK: una tool que no está "isn't in the subagent's session at all". Después:

```text
Ahora usá el subagente fixer para aplicar ese arreglo.
```

Este sí edita: tiene `Edit`.

### 4. `disallowedTools` hereda el resto (5 min)

```text
Usá el subagente test-runner para correr: python -c "import sys; sys.path.insert(0,'src'); import calc; print(calc.suma(2,3))"
```

`test-runner` heredó todo menos `Write` y `Edit`, así que tiene `Bash`. Pedile después que corrija el archivo: no puede.

### 5. La trampa del especificador (10 min)

Cambiá el frontmatter de `test-runner` a:

```markdown
disallowedTools: Write, Edit, Bash(git push *)
```

Reiniciá Claude Code y pedile de nuevo que corra el comando de Python. Ya no puede: un `disallowedTools` con especificador **saca todo Bash**, no solo `git push`.

Arreglo correcto: volvé a `disallowedTools: Write, Edit` y bloqueá solo el push con una regla de permisos en `.claude/settings.json`:

```json
{ "permissions": { "deny": ["Bash(git push *)"] } }
```

Reiniciá y verificá que el comando de Python vuelve a funcionar.

### 6. Pensalo en el SDK (5 min, sin correr)

El mismo reparto en el Agent SDK sería un `AgentDefinition` por rol con su `tools` (o `disallowedTools`). Escribí en papel los tres `AgentDefinition` con los mismos sets que arriba.

## Cómo sabés que salió bien

- `code-analyst` encontró el bug pero no pudo editar.
- `fixer` editó `src/calc.py`.
- `test-runner` corrió Python con `disallowedTools: Write, Edit`, y dejó de poder correrlo con `Bash(git push *)` en `disallowedTools`.
- Con la regla en `permissions.deny`, Bash volvió a andar y el push queda bloqueado.

## Si algo falla

- **Claude no encuentra los subagentes**: reiniciá la sesión; un directorio `agents` creado durante la sesión puede no detectarse.
- **El subagente no arranca y el error nombra entradas sin resolver**: algún nombre en `tools` está mal escrito y la lista quedó sin ninguna tool válida.
- **Claude no delega**: nombrá el subagente explícitamente en el pedido ("Usá el subagente X…").
- **"Igual se arregló el archivo"**: la conversación principal tiene su propio set de tools y, cuando el subagente vuelve diciendo que no pudo, Claude puede hacer el cambio él mismo. Para este lab mirá qué tools usó **el subagente** en la transcripción, no solo el resultado final.
