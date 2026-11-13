---
objective: 32
title: "Grep, Glob, Read o Bash: qué herramienta para qué"
rule: "¿Buscás por NOMBRE de archivo? Glob. ¿Por CONTENIDO? Grep. ¿Ya sabés qué archivo? Read. ¿Hay que EJECUTAR algo (git, tests, ls)? Bash."
sources:
  - url: https://code.claude.com/docs/en/tools-reference
    title: "Tools reference"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "Guía oficial del examen (Task Statement 2.5)"
status: verificada
---

## Qué es

Claude Code tiene herramientas built-in con trabajos distintos. El examen te da una tarea y te pide la herramienta. La pregunta clave: **¿qué es lo que estoy buscando o haciendo?**

| Tool | Hace | Ejemplo típico | Lo que NO hace |
|---|---|---|---|
| **Glob** | Encuentra archivos por patrón de nombre | `**/*.test.tsx`, `src/**/*.ts` | No mira contenido. Corta en 100, ordena por fecha de modificación |
| **Grep** | Busca patrones DENTRO de los archivos (ripgrep) | Llamadores de `calculateTax(`, un mensaje de error, un import | No ve archivos gitignored (salvo que le pases la ruta) |
| **Read** | Lee un archivo con números de línea (también imágenes, PDFs, notebooks) | Leer el archivo que encontraste | No lee directorios. No lee binarios como `.xlsx` o `.zip` |
| **Bash** | Ejecuta comandos de shell | `git diff`, correr tests, `ls`, builds | Cada comando es un proceso aparte: un `export` no persiste |
| **Edit** | Reemplazo exacto de un string | Cambiar una línea puntual | No usa regex. `old_string` tiene que ser único |
| **Write** | Crea o sobrescribe un archivo entero | Archivo nuevo o reescritura total | No agrega al final ni mergea |

## Cuándo se usa

- **"Todos los archivos de test de componentes"** → Glob `**/*.test.tsx`. Es un patrón de nombre.
- **"¿Quién llama a `calculateTax`?"** → Grep `calculateTax\(`. El nombre del archivo no te lo dice.
- **"¿Qué hay en `migrations/`?"** → `ls` por Bash (o Glob `migrations/*`). Read sobre una carpeta da error.
- **"¿Qué cambió en esta rama?"** → `git diff --name-only main...HEAD` por Bash. La fecha de modificación de Glob no es "cambiado en la rama".
- **"Edit falla porque el texto aparece 4 veces y quiero cambiar uno"** → `old_string` más largo con contexto. `replace_all: true` solo si querés cambiar todos. Si no hay forma de hacerlo único, la guía del examen da el fallback: Read del archivo completo + Write.
- **"Todos los `.pem`, incluso los gitignored"** → Glob: por defecto **no** respeta `.gitignore`. Grep sí los saltea.
- **"Buscar `interface{}`"** → Grep con las llaves escapadas: `interface\{\}`.

## El error típico que el examen quiere que cometas

- **Usar Grep para algo que es de nombre** (buscar `\.test\.tsx` como texto) o **Glob para algo que es de contenido** (`**/*tax*` para encontrar llamadores).
- **"Read con `offset`/`limit` sobre una carpeta"**: `offset`/`limit` paginan archivos grandes, no listan carpetas.
- **"Write agrega la línea al final"**: Write sobrescribe todo.
- **"Prompt que dice 'usá Bash solo para grep'"** para limitar a un subagente: eso es guidance. El enforcement es la lista `tools`. La doc lo muestra: `tools: Read, Grep, Glob` y el límite "is enforced by Claude Code rather than requested in a prompt".

## Ejemplo

Un detalle que la doc aclara y conviene saber: en **macOS, Linux y WSL**, Glob y Grep **no están en el set por defecto**. Claude busca con `find` y `grep` a través de Bash. Vuelven si:

- los nombrás en `--tools` o `--allowedTools` al arrancar, o
- un subagente los lista en `tools` y deja afuera Bash.

Un explorador de solo lectura para el equipo:

```markdown
---
name: explorer
description: Busca y lee código para responder preguntas sobre el repo. No edita.
tools: Read, Grep, Glob
---
Encontrá archivos con Glob, buscá contenido con Grep y leé solo lo necesario con Read.
Devolvé rutas y líneas exactas.
```

## Para recordar

- Nombre → Glob. Contenido → Grep. Archivo conocido → Read. Ejecutar → Bash.
- Carpeta → `ls` (Bash), no Read.
- Edit = exacto y único; Write = sobrescribe.
- Glob ve gitignored; Grep no. Grep = regex de ripgrep (escapá `{`, `(`).
