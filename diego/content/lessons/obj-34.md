---
objective: 34
title: "MCP: resources vs. tools (y prompts)"
rule: "¿Es una ACCIÓN que el modelo decide hacer? → tool. ¿Son DATOS de solo lectura para dar contexto (catálogo, schema, docs)? → resource, con URI, y la app lo adjunta."
sources:
  - url: https://modelcontextprotocol.io/docs/learn/server-concepts
    title: "Understanding MCP servers"
  - url: https://modelcontextprotocol.io/specification/2025-11-25/server/resources
    title: "Resources (spec 2025-11-25)"
  - url: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
    title: "Tools (spec 2025-11-25)"
  - url: https://code.claude.com/docs/en/mcp
    title: "Connect Claude Code to tools via MCP"
status: no_verificado
---

## Qué es

Un servidor MCP ofrece tres cosas. La diferencia está en **quién decide usarlas**:

| Pieza | Qué es | Quién la controla | Ejemplo | En Claude Code |
|---|---|---|---|---|
| **Tool** | Una función que hace algo: busca, escribe, llama una API | El **modelo** decide cuándo llamarla | `create_ticket`, `run_query` | Claude la llama sola (`mcp__server__tool`) |
| **Resource** | Datos pasivos, de solo lectura, para dar contexto. Cada uno tiene una **URI** | La **aplicación** decide cómo y cuándo incluirlos | `postgres:schema://users`, `docs:file://api/auth` | Los adjuntás con `@server:protocolo://ruta` |
| **Prompt** | Una plantilla de instrucciones | El **usuario** la invoca explícitamente | "Plan a vacation" | Aparece como `/server:prompt (MCP)` |

La doc de MCP lo dice así: resources son "Passive data sources that provide read-only access to information for context, such as file contents, database schemas, or API documentation". Tools son "Functions that your LLM can actively call".

Los resources se descubren con `resources/list` y se leen con `resources/read`. Si el dato es parametrizable, el server publica un **resource template** (`travel://activities/{city}/{category}`), con título, descripción y MIME type.

## Cuándo se usa

- **Catálogos, schemas, documentación, listas de proyectos**: cosas que el agente necesita *ver* para orientarse. Van como resources. El agente sabe qué hay sin tener que salir a explorar.
- **Acciones o consultas con parámetros que el modelo elige** (crear un issue, correr una query puntual, mandar un mensaje): van como tools.
- **Un flujo armado que el humano dispara** ("revisá este PR con nuestro checklist"): prompt.

¿Por qué importa para la eficiencia? Si el catálogo de tablas de tres sistemas solo existe detrás de tools como `list_tables` o `search_docs`, el agente gasta varias vueltas "tanteando" antes de hacer la consulta de verdad. Si el server expone ese catálogo como resource, la aplicación lo puede adjuntar de entrada (en Claude Code, con una @-mention) y el agente va directo a la tool correcta.

## El error típico que el examen quiere que cometas

1. **"Agreguemos una tool `list_everything`"** para que el agente descubra qué datos hay. Funciona, pero sigue siendo una llamada exploratoria por turno que el modelo tiene que decidir hacer. Si es contenido estático o de referencia, exponelo como **resource**.
2. **Poner acciones como resources.** Un resource es de solo lectura y para contexto. "Crear un ticket" nunca es un resource.
3. **Pensar que el modelo "llama" resources como llama tools.** En MCP los resources son *application-driven*: la app decide qué incluir. En Claude Code, vos los referenciás con `@` y se adjuntan solos ("Resources are automatically fetched and included as attachments when referenced"). Claude Code además le da a Claude tools para listarlos y leerlos cuando el server los soporta.
4. **Confundir prompts con resources.** Un prompt es una plantilla de instrucciones que invoca el usuario (`/server:prompt`), no datos.

## Ejemplo

Una empresa conecta Claude Code a tres servers: `crm`, `billing` y `warehouse`. Preguntas típicas cruzan los tres ("clientes con facturas vencidas y stock reservado").

- Antes: cada server solo tenía tools. El agente llamaba `crm.list_tables`, `billing.describe_schema`, `warehouse.search_fields`… cinco o seis vueltas antes de la primera query útil.
- Después: cada server expone su schema como resource (`crm:schema://customers`, `billing:schema://invoices`). El dev escribe:

```text
Usando @crm:schema://customers y @billing:schema://invoices, listá los clientes con facturas vencidas.
```

Los dos schemas se adjuntan al prompt y Claude va directo a las tools de consulta.

## Para recordar

- Tool = acción, la decide el **modelo**. Resource = dato de solo lectura con URI, lo maneja la **aplicación**. Prompt = plantilla, la invoca el **usuario**.
- Catálogos y schemas que el agente necesita para orientarse → resources: menos tool calls exploratorias.
- Claude Code: `@` lista los resources de los servers conectados; formato `@server:protocolo://ruta`; se adjuntan solos.
- Datos parametrizables → resource template con URI template.
