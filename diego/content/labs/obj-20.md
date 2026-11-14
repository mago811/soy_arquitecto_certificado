---
objective: 20
title: "Lab: explorar un repo real con subagentes, notas, /compact y /clear"
minutes: 55
needs: ["Claude Code en Windows (PowerShell)", "Git for Windows", "un repo open source mediano (ej. express)"]
sources:
  - url: https://code.claude.com/docs/en/context-window
    title: "Explore the context window"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://code.claude.com/docs/en/commands
    title: "Commands"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
status: verificada
---

## Objetivo

Hacer una exploración de verdad y medir con `/context` qué pasa con la ventana cuando: (a) explorás en la conversación principal, (b) delegás a un subagente, (c) usás un archivo de notas, (d) compactás con foco, (e) limpiás con `/clear`. Y comprobar qué sobrevive a la compactación.

## Pasos

### 0. Preparar (5 min)

En PowerShell:

```powershell
git clone --depth 1 https://github.com/expressjs/express.git lab-obj20
Set-Location lab-obj20
code CLAUDE.md
```

(Si no usás VS Code, cambiá `code` por `notepad`.) Pegá en `CLAUDE.md` y guardá:

```markdown
# Lab obj-20

- Respondé en español.
```

Después arrancá Claude Code desde la misma carpeta:

```powershell
claude
```

Aceptá el diálogo de confianza. Corré `/context` y anotá el total de tokens usados (línea base).

### 1. Explorar "a lo bruto" en la conversación principal (8 min)

```text
Sin usar subagentes, leé vos mismo los archivos de lib/ y explicame cómo se arma el pipeline de middleware.
```

Al terminar, `/context` otra vez. Anotá cuánto subió.

### 2. Lo mismo con un subagente (8 min)

```text
/clear exploracion-bruta
Usá el subagente Explore para averiguar cómo se arma el pipeline de middleware en lib/.
Devolveme solo: archivos clave con ruta, y 5 viñetas de hallazgos.
```

`/context` de nuevo. Compará con el paso 1: los archivos que leyó el subagente quedaron en SU ventana; a la tuya llegó el resumen.

### 3. Archivo de notas que sobrevive (8 min)

```text
Escribí en NOTES.md los hallazgos del subagente con rutas exactas y nombres de funciones.
De acá en adelante, antes de responder sobre el router, consultá NOTES.md.
```

Abrí `NOTES.md` en tu editor (`code NOTES.md`) y confirmá que tiene nombres concretos, no generalidades.

### 4. Instrucción en el chat vs. en CLAUDE.md (10 min)

En el chat:

```text
Regla: siempre que me muestres código, poné la ruta del archivo en la primera línea.
```

Pedí un par de fragmentos para confirmar que la sigue. Después:

```text
/compact keep NOTES.md findings about the router
```

Pedí otro fragmento. Puede que siga la regla (quedó en el resumen) o puede que no: **no está garantizado**. Ahora agregá la regla a `CLAUDE.md`: en otra ventana de PowerShell (o desde VS Code) abrí `code CLAUDE.md`, sumá esta línea al final y guardá:

```markdown
- Cuando muestres código, poné la ruta del archivo en la primera línea.
```

Confirmá desde PowerShell con `Get-Content CLAUDE.md`: tienen que verse las dos reglas.

Corré `/compact` de nuevo y pedí otro fragmento. Corré `/context all` y fijate que `CLAUDE.md` figura entre los archivos de memoria cargados: se relee del disco después de compactar.

### 5. Retomar un subagente (8 min)

```text
Usá el subagente general-purpose para listar los tests de lib/router y decime su agent ID cuando termine.
```

Después:

```text
Retomá ese mismo subagente y pedile que además me diga cuál test cubre los parámetros de ruta.
```

Compará con lo que pasa si pedís "retomá el Explore de antes": la doc dice que Explore y Plan son one-shot y no devuelven agent ID.

### 6. Cambio de tarea (3 min)

```text
/clear express-router
```

Pedí algo sin relación ("explicame el package.json"). Después `/resume` y elegí `express-router` para volver.

## Cómo sabés que salió bien

- El aumento de `/context` en el paso 2 es mucho menor que en el paso 1.
- `NOTES.md` tiene rutas y funciones reales.
- Después de compactar, la regla que está en `CLAUDE.md` se cumple y `CLAUDE.md` aparece en `/context all`.
- Pudiste retomar el `general-purpose`, no el Explore.
- `/resume` te muestra la sesión con el nombre que le pusiste.

## Si algo falla

- `/context` no muestra cambios grandes: con ventanas de 1M, los números pueden ser chicos en proporción. Compará tokens absolutos, no el porcentaje.
- Claude no usa el subagente: nombralo explícitamente ("usá el subagente Explore").
- No encontrás la sesión en `/resume`: usá `/rename express-router` antes de `/clear` la próxima vez.
