---
objective: 33
title: "Lab: tres subagentes, tres sets de tools"
minutes: 45
needs: ["Claude Code en Windows (PowerShell)", "Git for Windows", "Python para Windows (launcher py)", "una carpeta de prueba"]
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

En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj33
Set-Location lab-obj33
git init
New-Item -ItemType Directory -Force src, .claude\agents
code src\calc.py
```

(Si no usás VS Code, cambiá `code` por `notepad`.) Pegá en `src\calc.py` y guardá:

```python
def suma(a, b):
    return a - b  # bug
```

### 2. Tres subagentes (10 min)

Creá cada archivo con el editor (por ejemplo `code .claude\agents\code-analyst.md`) y pegá su contenido.

`.claude\agents\code-analyst.md`:

```markdown
---
name: code-analyst
description: Analiza código del repo sin modificarlo. Usar para encontrar bugs o explicar código.
tools: Read, Grep, Glob
---
Sos un analista. Reportá hallazgos con ruta y línea. Nunca modificás archivos.
```

`.claude\agents\fixer.md`:

```markdown
---
name: fixer
description: Aplica correcciones puntuales en el código cuando ya se sabe qué cambiar.
tools: Read, Edit, Grep, Glob
---
Aplicá exactamente el cambio pedido y nada más.
```

`.claude\agents\test-runner.md`:

```markdown
---
name: test-runner
description: Corre comandos de prueba y resume el resultado. No edita archivos.
disallowedTools: Write, Edit
---
Corré lo que te pidan y resumí la salida.
```

Abrí Claude Code en la carpeta (si ya estaba abierto, reinicialo para que lea `.claude\agents\`):

```powershell
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
Usá el subagente test-runner para correr: py -c "import sys; sys.path.insert(0,'src'); import calc; print(calc.suma(2,3))"
```

`test-runner` heredó todo menos `Write` y `Edit`, así que tiene las tools de shell (`Bash` con Git Bash y `PowerShell`). Tiene que imprimir `-1` (el bug). Pedile después que corrija el archivo: no puede.

### 5. La trampa del especificador (10 min)

Cambiá el frontmatter de `test-runner` a:

```markdown
disallowedTools: Write, Edit, Bash(git push *), PowerShell(git push *)
```

Reiniciá Claude Code y pedile de nuevo que corra el comando de Python. Ya no puede: cada entrada de `disallowedTools` con especificador **saca la tool entera** (`Bash` y `PowerShell`), no solo `git push`.

Por qué las dos: en Windows el subagente tiene dos tools de shell. Si pusieras solo `Bash(git push *)`, perdería `Bash` pero seguiría corriendo Python (y `git push`) por `PowerShell`. Probalo si querés: es la misma trampa, con un agujero extra.

Arreglo correcto: volvé a `disallowedTools: Write, Edit` y bloqueá solo el push con reglas de permisos en `.claude\settings.json`. Crealo con el editor (`code .claude\settings.json`), no con `Set-Content`, que en PowerShell 5.1 puede meter BOM y romper el JSON:

```json
{ "permissions": { "deny": ["Bash(git push *)", "PowerShell(git push *)"] } }
```

Van las dos reglas porque una regla `Bash(...)` no restringe la tool `PowerShell`. Además, en Windows una regla de deny solo para `Bash` apaga la tool `PowerShell` en toda la sesión, salvo que también haya una regla `PowerShell(...)`.

Reiniciá y verificá que el comando de Python vuelve a funcionar y que `git push origin main` queda denegado.

### 6. Pensalo en el SDK (5 min, sin correr)

El mismo reparto en el Agent SDK sería un `AgentDefinition` por rol con su `tools` (o `disallowedTools`). Escribí en papel los tres `AgentDefinition` con los mismos sets que arriba.

## Cómo sabés que salió bien

- `code-analyst` encontró el bug pero no pudo editar.
- `fixer` editó `src/calc.py`.
- `test-runner` corrió Python con `disallowedTools: Write, Edit`, y dejó de poder correrlo con `Bash(git push *), PowerShell(git push *)` en `disallowedTools`.
- Con las dos reglas en `permissions.deny`, el shell volvió a andar y el push queda bloqueado.

## Si algo falla

- **Claude no encuentra los subagentes**: reiniciá la sesión; un directorio `agents` creado durante la sesión puede no detectarse.
- **El subagente no arranca y el error nombra entradas sin resolver**: algún nombre en `tools` está mal escrito y la lista quedó sin ninguna tool válida.
- **`py` no se reconoce**: instalá Python desde python.org con el instalador de Windows (incluye el launcher `py`) y abrí una ventana nueva de PowerShell.
- **Claude no delega**: nombrá el subagente explícitamente en el pedido ("Usá el subagente X…").
- **"Igual se arregló el archivo"**: la conversación principal tiene su propio set de tools y, cuando el subagente vuelve diciendo que no pudo, Claude puede hacer el cambio él mismo. Para este lab mirá qué tools usó **el subagente** en la transcripción, no solo el resultado final.
