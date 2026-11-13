---
objective: 36
title: "Descripciones de tools que no se confunden"
rule: "La descripción es lo que Claude usa para elegir: qué hace, cuándo SÍ y cuándo NO, qué significa cada parámetro, qué NO devuelve. 3–4 frases mínimo; en MCP con Claude Code, lo crítico al principio."
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
    title: "Define tools"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
    title: "Handle tool calls"
  - url: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
    title: "Tools (spec 2025-11-25)"
  - url: https://code.claude.com/docs/en/mcp
    title: "Connect Claude Code to tools via MCP"
status: verificada
---

## Qué es

Repaso (esto ya lo sabés). Claude decide qué tool llamar mirando el pedido y **la descripción de cada tool**. La doc lo dice sin vueltas: las descripciones detalladas son "by far the most important factor in tool performance".

Una buena descripción cubre las cuatro cosas que lista la doc ("What the tool does", "When it should be used (and when it shouldn't)", "What each parameter means…", "Any important caveats or limitations, such as what information the tool does not return"), en al menos 3–4 frases:

| Qué | Ejemplo |
|---|---|
| Qué hace | "Busca clientes en el CRM por nombre o email." |
| Cuándo SÍ y cuándo NO | "Usala para datos de contacto. No la uses para facturas (para eso está `billing_search_invoices`)." |
| Qué es cada parámetro y su formato | "`email`: dirección completa, en minúsculas." |
| Límites: qué NO devuelve | "No devuelve historial de pagos." |

Y tres decisiones de diseño que ayudan a no confundir:

- **Namespacing**: `crm_search`, `billing_search` en vez de dos `search`.
- **Consolidar**: un `github_pr` con parámetro `action` en vez de `create_pr`, `review_pr`, `merge_pr`.
- **`input_examples`** para inputs complejos o con formato delicado (además de la descripción, no en lugar de).

## Cuándo se usa

Siempre que escribís una tool, y sobre todo cuando:

- Hay **tools parecidas** (dos "search", dos "get"): cada descripción deja claro cuándo usarla y cuándo no. Mencionar la tool vecina en ese "cuándo no" es una forma práctica de marcar la frontera (la doc pide el "cuándo no"; no exige nombrar la otra tool).
- Un parámetro tiene **formato** (fechas, ids, códigos): explicá qué significa en su descripción y, si es complejo o sensible al formato, sumá `input_examples`.
- Claude llama la tool **con parámetros que faltan o mal**: la doc dice que, en desarrollo, lo mejor es reintentar con `description` más detalladas.
- En **Claude Code con MCP**: las descripciones largas se cortan (4.096 caracteres para tools cargadas de entrada y para las instrucciones del server; 16.384 para las que llegan por tool search). Lo crítico va **al principio**.

## El error típico que el examen quiere que cometas

- **"Le agrego al system prompt cuál usar."** Ayuda poco si las descripciones siguen ambiguas. El arreglo de fondo está en las descripciones (y en los nombres).
- **Descripciones de una línea** tipo "Gets the stock price for a ticker." La doc la usa como ejemplo de descripción mala.
- **Forzar con `tool_choice`** para tapar el misrouting. Sirve para un paso puntual, no arregla la selección.
- **Partir en 20 tools mini** creyendo que "más específico = mejor". Más tools parecidas = más ambigüedad. Consolidá.

## Ejemplo

Antes (Claude confunde las dos):

```json
{ "name": "search", "description": "Search records." }
{ "name": "lookup", "description": "Look up data." }
```

Después:

```json
{
  "name": "crm_search_customers",
  "description": "Busca clientes en el CRM por nombre, email o id de cliente y devuelve datos de contacto y el ejecutivo asignado. Usala cuando el pedido es sobre una persona o empresa cliente. No devuelve facturas ni pagos: para eso usá billing_search_invoices. El parámetro query acepta texto libre; si es un email, se busca coincidencia exacta.",
  "input_schema": { "type": "object", "properties": { "query": { "type": "string", "description": "Nombre, email completo o id de cliente (formato CUS-12345)." } }, "required": ["query"] }
}
```

```json
{
  "name": "billing_search_invoices",
  "description": "Busca facturas en el sistema de facturación por número de factura o id de cliente y devuelve monto, estado y vencimiento. Usala para preguntas de deuda, pagos o vencimientos. No devuelve datos de contacto: para eso usá crm_search_customers. Las fechas se devuelven en formato ISO 8601.",
  "input_schema": { "type": "object", "properties": { "customer_id": { "type": "string", "description": "Id de cliente en formato CUS-12345." }, "invoice_number": { "type": "string", "description": "Número de factura, ej. F-2026-0042." } } }
}
```

## Para recordar

- La descripción es el mecanismo principal de selección. Mínimo 3–4 frases.
- Qué hace · cuándo sí / cuándo no · parámetros y formato · qué no devuelve.
- Tools parecidas → prefijo por servicio y descripción que marque la frontera.
- Muchas operaciones relacionadas → una tool con `action`.
- MCP en Claude Code: lo crítico al principio; el resto se puede cortar.
