---
objective: 17
title: "Explorar un codebase de a poco: Grep, Read, seguir imports"
rule: "Nunca 'leé todo primero': Grep para el punto de entrada, Read de esos archivos, seguir imports, y acotar cada búsqueda."
sources:
  - url: https://code.claude.com/docs/en/tools-reference
    title: "Tools reference"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/costs
    title: "Manage costs effectively (Reduce token usage)"
  - url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    title: "Effective context engineering for AI agents"
  - url: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
    title: "Guía oficial del examen (Task Statement 2.5)"
status: verificada
---

## Qué es

Explorar bien es construir el entendimiento **en capas**. Anthropic lo llama "just in time": el agente guarda referencias livianas (rutas, nombres) y carga contenido al contexto **solo cuando lo necesita**. Claude Code trabaja así: CLAUDE.md entra de entrada, y el resto se encuentra con glob y grep "just-in-time".

El circuito que pide el examen:

1. **Grep** para encontrar puntos de entrada (el endpoint, el nombre de la función, el mensaje de error).
2. **Read** de esos archivos, nada más.
3. **Seguir imports** y repetir con lo que encontraste.
4. Anotar lo importante (ver objetivo 20) en vez de releer.

## Cuándo se usa: los ajustes finos que el examen pregunta

| Situación | Ajuste |
|---|---|
| Querés saber qué archivos usan más algo, antes de leer | Grep con `output_mode: "count"` (por defecto es `files_with_matches`, solo rutas) |
| Necesitás la línea exacta | Grep con `output_mode: "content"` (archivo + número de línea) |
| Mucho ruido de docs, fixtures, otros lenguajes | Grep con `glob` (`**/*.tsx`) o `type` (`py`, `rust`) |
| Archivo enorme: Read vuelve con `PARTIAL view` | Grep para la línea, Read con `offset` y `limit` alrededor |
| Grep da 0 pero sabés que el texto está | ¿Está gitignored? Grep saltea `.gitignore`: pasale la ruta directo |
| Glob vuelve 100 archivos y aviso de truncamiento | Patrón más específico (`packages/*/src/**/*.ts`) |
| Función re-exportada por un wrapper | Read del wrapper para sacar los nombres exportados, Grep por cada uno |
| Nombre de símbolo ambiguo (`handle`) en TypeScript | Plugin de code intelligence: "go to definition" en una llamada |

Datos de la doc que conviene saber:

- Read devuelve como máximo **25.000 tokens** por llamada y rechaza un archivo entero de más de **256 KB**: hay que paginar con `offset`/`limit` o buscar con Grep.
- Glob ordena por **fecha de modificación** y corta en **100**.
- Grep usa la sintaxis regex de **ripgrep**.

## El error típico que el examen quiere que cometas

- **"Leé todos los archivos de `src/` para tener el panorama"**: suena prolijo, llena la ventana y la respuesta sale genérica.
- **"Leé primero los archivos más grandes"** o **"en orden alfabético"**: sigue siendo leer a ciegas.
- **Concluir "no existe" con un Grep vacío** sin pensar en `.gitignore` o en un wrapper que renombra.
- **Pedir "ignorá los resultados de docs"** en vez de acotar la búsqueda: los resultados ya entraron al contexto.

## Ejemplo

"¿Cómo funciona el reembolso?" en un repo de 1.200 archivos:

```text
Grep "refund" glob="src/**/*.ts" output_mode="count"   → 6 archivos, 2 con muchas coincidencias
Read src/api/refunds.ts                                 → importa RefundService
Grep "export" path="src/services/refund/index.ts"       → re-exporta processRefund como issueRefund
Grep "issueRefund\(" output_mode="content"              → 4 llamadores con línea
Read src/services/refund/RefundService.ts offset=120 limit=80
```

Cinco llamadas, contexto chico, flujo entendido.

Ojo práctico en tu máquina: en Windows, Grep y Glob vienen en el set de tools por defecto. Si querés que Claude explore solo con ellas (sin Bash ni PowerShell), arrancá con `claude --tools "Read,Grep,Glob"`: `--tools` restringe qué tools existen; `--allowedTools` solo las aprueba sin preguntar.

Dato de examen: en macOS, Linux y WSL Grep y Glob no vienen por defecto (Claude busca con `grep` y `find` por Bash) y vuelven si las nombrás en `--tools` o `--allowedTools`. La estrategia de exploración es la misma.

## Para recordar

- Entrada con Grep → Read dirigido → seguir imports.
- `count` para priorizar, `content` para la línea, `glob`/`type` para acotar.
- Grep saltea gitignored; Glob corta en 100.
- Wrapper → nombres exportados → Grep por cada uno.
