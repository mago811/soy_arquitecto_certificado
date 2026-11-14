---
objective: 21
title: "Lab: un chatbot que no se olvida de los números"
minutes: 50
needs: ["API key de Anthropic", "Python 3.10+ para Windows (con el launcher py)", "PowerShell"]
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/working-with-messages
    title: "Using the Messages API"
  - url: https://platform.claude.com/docs/en/build-with-claude/context-windows
    title: "Context windows"
  - url: https://platform.claude.com/docs/en/build-with-claude/token-counting
    title: "Token counting"
  - url: https://platform.claude.com/docs/en/build-with-claude/context-editing
    title: "Context editing"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
status: verificada
---

## Objetivo

Ver con tus ojos cuatro cosas que el examen pregunta en forma de "esto está roto":

1. La Messages API es stateless: si no mandás el historial, Claude no sabe nada.
2. Un resumen en prosa diluye números; un bloque de datos estructurado no.
3. Recortar el output de una tool baja muchísimo los tokens de entrada.
4. Context editing (`clear_tool_uses_20250919`) se activa con un parámetro, sin tocar tu historial local.

## Pasos

### 0. Preparar (5 min)

```powershell
New-Item -ItemType Directory -Force lab-obj21
Set-Location lab-obj21
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install anthropic
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # tu key; dura solo esta ventana de PowerShell
```

Cada `.py` de este lab lo creás con `code nombre.py` (o `notepad nombre.py`), pegás el contenido y guardás. Corré todo desde esta misma ventana de PowerShell, con el venv activado (el prompt empieza con `(.venv)`).

Todas las llamadas usan `claude-opus-5-5` con `max_tokens=4000`. Ojo: en este modelo el thinking siempre está activo y **cuenta dentro de `max_tokens`**, por eso no lo bajes de 4000.

### 1. Romperlo: la API no tiene memoria (10 min)

Creá `paso1.py`:

```python
import anthropic
client = anthropic.Anthropic()
M = "claude-opus-5-5"

def ask(messages):
    r = client.messages.create(model=M, max_tokens=4000, messages=messages)
    text = "".join(b.text for b in r.content if b.type == "text")
    print(f"[input_tokens={r.usage.input_tokens}] {text[:300]}\n")
    return text

t1 = "Hola, soy Diego. Mi pedido QX-88213 costó USD 1247.83 y me prometieron el reembolso el 14/11."
a1 = ask([{"role": "user", "content": t1}])

# ROTO: solo el último mensaje
ask([{"role": "user", "content": "¿Cuánto me tienen que devolver y cuándo?"}])

# ARREGLADO: historial completo
ask([
    {"role": "user", "content": t1},
    {"role": "assistant", "content": a1},
    {"role": "user", "content": "¿Cuánto me tienen que devolver y cuándo?"},
])
```

Corré `python paso1.py`. La segunda respuesta no sabe nada; la tercera sí. Mirá cómo sube `input_tokens` cuando mandás el historial: ese es el costo de ser stateless.

### 2. Resumen vago vs. bloque de datos (10 min)

Creá `paso2.py`:

```python
import anthropic, json
client = anthropic.Anthropic()
M = "claude-opus-5-5"
q = "Respondé en una línea: ¿monto exacto, número de pedido y fecha del reembolso?"

resumen_vago = "Resumen: el cliente Diego tiene un pedido de alrededor de mil dólares y espera un reembolso a mediados de mes."
case_facts = {"order_id": "QX-88213", "amount": 1247.83, "currency": "USD",
              "refund_date": "2026-11-14", "status": "approved"}

for nombre, system in [
    ("SOLO RESUMEN", resumen_vago),
    ("RESUMEN + CASE FACTS", resumen_vago + "\n<case_facts>\n" + json.dumps(case_facts) + "\n</case_facts>"),
]:
    r = client.messages.create(model=M, max_tokens=4000, system=system,
                               messages=[{"role": "user", "content": q}])
    print(nombre, "→", "".join(b.text for b in r.content if b.type == "text"))
```

Con solo el resumen, Claude no puede dar el monto exacto (si lo da, lo inventó). Con el bloque, sale exacto. Esto es lo que pasa después de dos o tres resúmenes progresivos.

### 3. Recortar el output de la tool (10 min)

Creá `paso3.py`. Simula el resultado de una tool `lookup_order` con 45 campos y compara tokens con el token counting API:

```python
import anthropic, json
client = anthropic.Anthropic()
M = "claude-opus-5-5"

completo = {f"campo_interno_{i}": f"valor de relleno largo número {i} " * 3 for i in range(40)}
completo.update({"order_id": "QX-88213", "status": "delivered", "total": 1247.83,
                 "delivered_at": "2026-11-02", "return_window_days": 30})
relevantes = {k: completo[k] for k in ["order_id", "status", "total", "delivered_at", "return_window_days"]}

for nombre, data in [("45 campos", completo), ("5 campos", relevantes)]:
    msgs = [{"role": "user", "content": "Resultado de lookup_order:\n" + json.dumps(data) + "\n¿Puede devolverlo?"}]
    n = client.messages.count_tokens(model=M, messages=msgs)
    print(nombre, n.input_tokens, "tokens")
```

Multiplicá la diferencia por 15 llamadas en una conversación: eso es lo que se acumula si no recortás en la tool.

### 4. Context editing: activar la limpieza de resultados viejos (10 min)

Leé en la página de context editing el ejemplo de Python y la tabla de opciones (`trigger`, `keep`, `exclude_tools`, `clear_tool_inputs`, `clear_at_least`). La forma mínima, copiada de la doc, es:

```python
response = client.beta.messages.create(
    model="claude-opus-5-5",
    max_tokens=4096,
    messages=[{"role": "user", "content": "Search for recent developments in AI"}],
    tools=[{"type": "web_search_20250305", "name": "web_search"}],
    betas=["context-management-2025-06-27"],
    context_management={"edits": [{"type": "clear_tool_uses_20250919"}]},
)
```

Escribí en un `notas.md`, con tus palabras:

- ¿Qué se borra por defecto, el resultado o también la llamada?
- ¿Con qué opción protegerías una tool `get_case_facts` para que nunca se borre?
- ¿Tu app tiene que sincronizar su historial local con lo que borró la API? (Buscá "Your client application maintains the full, unmodified conversation history".)

## Cómo sabés que salió bien

- Paso 1: la respuesta "rota" no sabe el monto; la arreglada sí, y `input_tokens` creció.
- Paso 2: solo con `<case_facts>` aparece `1247.83` y `QX-88213`.
- Paso 3: la versión de 5 campos usa una fracción de los tokens de la de 45.
- Paso 4: respondiste: solo resultados por defecto; `exclude_tools`; no, el cliente mantiene el historial completo.

## Si algo falla

- `401`: revisá `ANTHROPIC_API_KEY`.
- La respuesta viene vacía o cortada: subí `max_tokens` (el thinking del modelo ocupa parte). Nunca menos de 4000.
- `count_tokens` no existe: actualizá el SDK con `pip install -U anthropic`.
- No hace falta correr el paso 4 (usa web search, que puede no estar habilitado en tu organización): el objetivo es leer y entender la configuración.
- **PowerShell no deja ejecutar `Activate.ps1`** ("la ejecución de scripts está deshabilitada en este sistema"): corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, contestá que sí y volvé a correr `.\.venv\Scripts\Activate.ps1`.
- **`py` no se reconoce como comando**: instalá Python para Windows desde python.org (trae el launcher `py`) y abrí una ventana nueva de PowerShell.
- **Abriste otra ventana de PowerShell y nada anda**: `$env:ANTHROPIC_API_KEY` y el venv duran solo esa sesión. En la ventana nueva, entrá a la carpeta del lab, activá el venv y volvé a cargar la key.
