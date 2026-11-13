---
objective: 9
title: "Lab: pipeline de 3 etapas que sobrevive a un corte"
minutes: 55
needs: ["API key de Anthropic", "Python 3.10+", "pip install claude-agent-sdk", "git"]
sources:
  - url: https://code.claude.com/docs/en/agent-sdk/sessions
    title: "Work with sessions"
  - url: https://code.claude.com/docs/en/agent-sdk/python
    title: "Agent SDK reference - Python"
  - url: https://code.claude.com/docs/en/agent-sdk/structured-outputs
    title: "Get structured output from agents"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
status: no_verificado
---

## Objetivo

Armar un pipeline `inventario → análisis → síntesis` donde cada etapa guarda su resultado y un **manifiesto** dice qué está hecho. Cortarlo a mitad de camino, relanzarlo y verificar que no repite lo hecho ni pierde hallazgos. De paso: usar `resume` con un `session_id` guardado y `fork_session` para explorar una alternativa.

## Pasos

### 0. Preparar (5 min)

```bash
mkdir lab-obj09 && cd lab-obj09
git init
python3 -m venv .venv && source .venv/bin/activate
pip install claude-agent-sdk
export ANTHROPIC_API_KEY=tu-api-key
mkdir -p repo state
echo 'def login(u, p): return u == "admin" and p == "1234"' > repo/auth.py
echo 'def cobrar(monto): return monto * 1.21' > repo/pagos.py
```

### 1. El pipeline con manifiesto (20 min)

Creá `pipeline.py`:

```python
import asyncio, json, pathlib, sys
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

STATE = pathlib.Path("state")
MANIFEST = STATE / "manifest.json"
ETAPAS = ["inventario", "analisis", "sintesis"]

SCHEMA = {
    "type": "object",
    "properties": {
        "resumen": {"type": "string"},
        "hallazgos": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["resumen", "hallazgos"],
}

def cargar_manifest():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {e: {"status": "pending"} for e in ETAPAS}

def guardar_manifest(m):
    MANIFEST.write_text(json.dumps(m, indent=2, ensure_ascii=False))

def prompt_para(etapa, previos):
    contexto = json.dumps(previos, indent=2, ensure_ascii=False)
    pedidos = {
        "inventario": "Listá los archivos de repo/ y qué hace cada uno.",
        "analisis": "Buscá problemas de seguridad en repo/.",
        "sintesis": "Escribí un informe final de 5 líneas.",
    }
    return f"<resultados_previos>\n{contexto}\n</resultados_previos>\n\n{pedidos[etapa]}"

async def correr(etapa, previos, manifest):
    manifest[etapa]["status"] = "in_progress"
    guardar_manifest(manifest)
    async for msg in query(
        prompt=prompt_para(etapa, previos),
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Glob", "Grep"],
            output_format={"type": "json_schema", "schema": SCHEMA},
        ),
    ):
        if isinstance(msg, ResultMessage):
            manifest[etapa]["session_id"] = msg.session_id  # viene aunque haya error
            guardar_manifest(manifest)
            if not msg.is_error and msg.structured_output:
                out = STATE / f"{etapa}.json"
                out.write_text(json.dumps(msg.structured_output, indent=2, ensure_ascii=False))
                manifest[etapa].update(status="done", output=str(out))
                guardar_manifest(manifest)
                return msg.structured_output
    raise RuntimeError(f"La etapa {etapa} no terminó bien")

async def main():
    manifest = cargar_manifest()
    previos = {}
    for etapa in ETAPAS:
        if manifest[etapa]["status"] == "done":
            print(f"↷ {etapa}: ya estaba hecha, la salteo")
            previos[etapa] = json.loads(pathlib.Path(manifest[etapa]["output"]).read_text())
            continue
        print(f"▶ {etapa}")
        previos[etapa] = await correr(etapa, previos, manifest)
        if "--cortar" in sys.argv and etapa == "analisis":
            print("✂ Simulo un corte después de analisis")
            return
    print(json.dumps(previos["sintesis"], indent=2, ensure_ascii=False))

asyncio.run(main())
```

### 2. Cortarlo (5 min)

```bash
python pipeline.py --cortar
cat state/manifest.json
```

Tenés que ver `inventario` y `analisis` en `done`, `sintesis` en `pending`, y un `session_id` por etapa corrida.

### 3. Retomarlo (5 min)

```bash
python pipeline.py
```

Esperable: `↷ inventario: ya estaba hecha`, `↷ analisis: ya estaba hecha`, `▶ sintesis`. La síntesis recibe los hallazgos de las dos etapas anteriores **en su prompt** (bloque `<resultados_previos>`), sin volver a leer el repo.

### 4. Resume por ID y fork (15 min)

Agregá `retomar.py`:

```python
import asyncio, json, sys
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

sid = json.load(open("state/manifest.json"))["analisis"]["session_id"]
fork = "--fork" in sys.argv

async def main():
    async for msg in query(
        prompt="¿Cuál de los problemas que encontraste es el más grave y por qué?",
        options=ClaudeAgentOptions(resume=sid, fork_session=fork, max_turns=3),
    ):
        if isinstance(msg, ResultMessage):
            print("session_id:", msg.session_id, "| original:", sid)
            print(msg.result)

asyncio.run(main())
```

```bash
python retomar.py          # resume: misma sesión, responde sin releer el repo
python retomar.py --fork   # fork: session_id NUEVO, el original queda intacto
```

### 5. La trampa del fork y los archivos (5 min)

Pensá (o probá): si en el fork le pedís "corregí `repo/auth.py`", ¿el archivo cambia también para la sesión original? Sí: el fork separa la **conversación**, no el disco. Para eso: `git stash`/`git checkout`, un directorio aparte (`cwd`) o file checkpointing.

## Cómo sabés que salió bien

- Después del corte, el relanzamiento saltea las etapas `done` y no gasta tokens en ellas.
- `state/` tiene un JSON por etapa terminada y el manifiesto refleja el estado real.
- `retomar.py` sin `--fork` imprime el mismo `session_id`; con `--fork` imprime uno distinto.
- Podés explicar por qué en un servidor con muchos jobs usarías `resume=<id>` y no `continue_conversation=True`.

## Si algo falla

- **`structured_output` viene vacío:** chequeá `is_error` y el `subtype` del result (por ejemplo `error_max_structured_output_retries`). Simplificá el schema.
- **La síntesis vuelve a leer el repo:** no es un error grave (tiene `Read`), pero muestra que el prompt no le dejó claro que ya tiene los resultados. Decíselo explícito.
- **`resume` no encuentra la sesión:** los archivos de sesión son locales a la máquina. Corré `retomar.py` en la misma máquina y desde la misma carpeta.
