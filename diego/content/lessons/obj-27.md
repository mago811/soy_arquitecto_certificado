---
objective: 27
title: "Tool use + JSON schema: que la tool se llame SIEMPRE"
rule: "auto deja que Claude conteste en texto; si el texto rompe el downstream → tool_choice any/tool (en modelos que lo soportan) + strict: true. Si el modelo no acepta forzar → auto + strict o structured outputs."
sources:
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
    title: "Define tools (Forcing tool use)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
    title: "Tool use with Claude"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
    title: "Strict tool use"
  - url: https://platform.claude.com/docs/en/api/errors
    title: "Errors (Forced tool use not supported)"
  - url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
    title: "How tool use works"
status: verificada
---

## Qué es

Una tool es un contrato: `name`, `description` y un `input_schema` en JSON Schema. Cuando Claude la llama, la respuesta trae `stop_reason: "tool_use"` y un bloque `tool_use` con `input` armado según ese schema. Por eso las tools sirven para **salida estructurada**: la doc dice que "a tool schema enforces the shape".

Pero hay dos preguntas distintas:

1. **¿Claude va a llamar la tool?** → lo decide `tool_choice`.
2. **¿El `input` va a respetar el schema al 100%?** → lo decide `strict: true`.

| `tool_choice` | Qué hace |
|---|---|
| `{"type": "auto"}` | Default con tools. Claude elige: tool **o texto** |
| `{"type": "any"}` | Tiene que usar **alguna** tool |
| `{"type": "tool", "name": "x"}` | Tiene que usar **esa** tool |
| `{"type": "none"}` | No puede usar tools |

## Cuándo se usa

- **Pipeline de extracción con una sola tool** (`registrar_factura`) y el código espera siempre un `tool_use` → `tool_choice: {"type": "tool", "name": "registrar_factura"}`.
- **Varias tools válidas, cualquiera sirve, pero texto no** → `{"type": "any"}`.
- **Los inputs tienen que tener el tipo exacto** (`passengers: 2`, no `"2"` ni `"two"`) → `strict: true`. La doc: "With strict: true, the response always contains passengers: 2."
- **Las dos garantías juntas** → `any` + `strict: true`. La doc lo recomienda textual: "to guarantee both that one of your tools is called and that the tool inputs strictly follow your schema".

**Ojo, dato actual de la doc:** no todos los modelos aceptan forzar. Claude Opus 5.5, Sonnet 5.5, Fable 5.1/5.2 y Mythos 5.1/5.2 devuelven **400** con `any` o `tool`. Ahí la doc dice: `auto` + `strict: true`, o structured outputs si querés la respuesta misma en JSON. Haiku 5.5 y Opus 5, por ejemplo, sí aceptan forzar.

## El error típico que el examen quiere que cometas

- **"Poné en el system prompt: SIEMPRE usá la tool."** Sube la probabilidad, pero no garantiza. La doc: "To require a tool call rather than rely on prompting, set tool_choice."
- **"`tool_choice: auto` alcanza."** Con `auto`, Claude puede contestar en texto. Ese texto es el que rompe tu parser.
- **"Forzá la tool y además pedile que explique antes."** Con `any`/`tool`, la API prefillea el turno: no hay texto antes del `tool_use`, aunque lo pidas. Si querés explicación, `auto` + instrucción en el mensaje del usuario.
- **Forzar con extended thinking manual** (`thinking: {type: "enabled"}`) → error. Solo `auto` o `none`. Y donde forzar sí anda, la respuesta arranca con el `tool_use` y no hay bloque `thinking`.
- **Creer que `strict` hace que los datos sean ciertos.** Garantiza la forma, no la verdad.

## Ejemplo

Un e-commerce clasifica reclamos. Hoy parsea con regex la frase "Categoría: X" del texto de Claude. A veces Claude escribe "La categoría sería X" y la regex no matchea.

Fix (modelo que acepta forzar, por ejemplo `claude-haiku-5-5`):

```python
tools = [{
    "name": "clasificar_reclamo",
    "description": "Registra la categoría de un reclamo de cliente. Usala siempre con un único reclamo.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "categoria": {"type": "string", "enum": ["envio", "pago", "producto", "otro"]}
        },
        "required": ["categoria"],
        "additionalProperties": False,
    },
}]
resp = client.messages.create(
    model="claude-haiku-5-5", max_tokens=512, tools=tools,
    tool_choice={"type": "tool", "name": "clasificar_reclamo"},
    messages=[{"role": "user", "content": reclamo}],
)
bloque = next(b for b in resp.content if b.type == "tool_use")
print(bloque.input["categoria"])
```

Leé el `input` del bloque `tool_use`, no `content[0].text`.

## Para recordar

- `tool_choice` decide **si** llama; `strict` decide **cómo** llama.
- `auto` = puede contestar en texto. `any` = alguna tool. `tool` = esa tool. `none` = ninguna.
- Forzado = sin texto previo y sin thinking.
- Modelo que rechaza forzar → `auto` + `strict`, o structured outputs.
