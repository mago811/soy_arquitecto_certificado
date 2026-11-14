---
objective: 24
title: "Lab: un prompt que revisa todo vs. tres pasadas con sus propios ejemplos"
minutes: 50
needs: ["API key de Anthropic", "Python 3.10+ para Windows (con el launcher py)", "PowerShell"]
sources:
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
    title: "Increase output consistency"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
  - url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    title: "Structured outputs"
  - url: https://platform.claude.com/docs/en/build-with-claude/thinking
    title: "Thinking (cuenta para max_tokens)"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
    title: "Prompting Claude Opus 5 (code review)"
status: verificada
---

## Objetivo

Revisar el mismo código con (A) un prompt único que mezcla seguridad, negocio y API, y (B) tres pasadas separadas, cada una con sus propios ejemplos. Contar cuántos de los bugs plantados encuentra cada diseño y mergear los resultados de B en código.

Modelo: `claude-opus-5-5`. Tiene thinking siempre prendido y esos tokens cuentan para `max_tokens`, por eso usamos 8000.

## Pasos

1. Entorno:

```powershell
New-Item -ItemType Directory -Force lab24
Set-Location lab24
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install anthropic
$env:ANTHROPIC_API_KEY = "sk-ant-..."   # tu key; dura solo esta ventana de PowerShell
```

Cada `.py` de este lab lo creás con `code nombre.py` (o `notepad nombre.py`), pegás el contenido y guardás. Corré todo desde esta misma ventana de PowerShell, con el venv activado (el prompt empieza con `(.venv)`).

2. Creá `codigo.py` con 6 bugs plantados (2 por tema):

```python
CODIGO = '''
@app.get("/facturas")                       # API: devuelve 200 con {"error":...} cuando falla
def listar(req):
    tenant = req.args["tenant"]               # SEGURIDAD: tenant viene del query, no de la sesión
    q = f"SELECT * FROM facturas WHERE tenant='{tenant}'"   # SEGURIDAD: SQL injection
    try:
        return {"items": db.run(q)}
    except Exception as e:
        return {"error": str(e)}, 200

@app.post("/facturas/crear")              # API: verbo en la URL, sin versión
def crear(req):
    monto = req.json["monto"]
    descuento = req.json.get("descuento", 0)
    total = monto - monto * descuento         # NEGOCIO: descuento puede ser > 1 => total negativo
    if total > 10000: aplicar_iva = False     # NEGOCIO: exime IVA a montos grandes (al revés)
    return {"total": total}
'''
BUGS = ["sql injection", "tenant del query", "descuento > 1", "iva invertido", "200 en error", "verbo en url"]
```

3. Formato común de hallazgo (para poder mergear). Creá `comun.py`:

```python
import json, anthropic
client = anthropic.Anthropic()
SCHEMA = {
  "type": "object",
  "properties": {"hallazgos": {"type": "array", "items": {
      "type": "object",
      "properties": {
        "linea": {"type": "string"},
        "tema": {"type": "string", "enum": ["seguridad", "negocio", "api"]},
        "severidad": {"type": "string", "enum": ["alta", "media", "baja"]},
        "descripcion": {"type": "string"}},
      "required": ["linea", "tema", "severidad", "descripcion"],
      "additionalProperties": False}}},
  "required": ["hallazgos"], "additionalProperties": False}

def revisar(system, codigo):
    r = client.messages.create(
        model="claude-opus-5-5", max_tokens=8000, system=system,
        messages=[{"role": "user", "content": f"<codigo>{codigo}</codigo>"}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}})
    texto = next(b.text for b in r.content if b.type == "text")
    return json.loads(texto)["hallazgos"]
```

4. **Diseño A: un solo prompt mezclado.** `a.py`:

```python
from comun import revisar
from codigo import CODIGO
SYSTEM_A = """Sos revisor de código. Buscá problemas de seguridad, de lógica de negocio y de diseño de API.
<examples>
<example>Endpoint /getUser usa verbo en la URL -> tema api</example>
<example>Respuesta sin paginación -> tema api</example>
<example>Nombre de variable poco claro -> tema api</example>
</examples>"""
for h in revisar(SYSTEM_A, CODIGO): print(h["tema"], "|", h["descripcion"])
```

Corré `python a.py` 2 o 3 veces. Marcá cuáles de los 6 `BUGS` aparecen. Fijate: los ejemplos son casi todos de API.

5. **Diseño B: tres pasadas, cada una con sus ejemplos.** `b.py`:

```python
from comun import revisar
from codigo import CODIGO
PASADAS = {
 "seguridad": """Revisá SOLO seguridad (inyección, autorización, aislamiento entre tenants, secretos). Reportá todo lo que encuentres.
<examples>
<example>cursor.execute("... WHERE id=" + user_id) -> SQL injection, alta</example>
<example>org_id tomado de un header que manda el cliente -> autorización rota, alta</example>
<example>logger.info(f"login {email} {password}") -> secreto en logs, alta</example>
<example>query parametrizada con org_id de la sesión -> sin hallazgo</example>
</examples>""",
 "negocio": """Revisá SOLO lógica de negocio (cálculos, reglas, estados). Reportá todo lo que encuentres.
<examples>
<example>precio * cantidad sin validar cantidad negativa -> total negativo, alta</example>
<example>envío gratis si total < 100 cuando la regla es > 100 -> condición invertida, alta</example>
<example>redondeo a 2 decimales antes de sumar -> error acumulado, media</example>
<example>validación de rango 0..1 para un porcentaje -> sin hallazgo</example>
</examples>""",
 "api": """Revisá SOLO diseño de API (contratos, códigos HTTP, URLs, versionado). Reportá todo lo que encuentres.
<examples>
<example>POST /crearUsuario -> verbo en la URL, media</example>
<example>error devuelto con status 200 -> código HTTP incorrecto, alta</example>
<example>/v1/usuarios con 201 y Location -> sin hallazgo</example>
</examples>""",
}
todos = []
for tema, system in PASADAS.items():
    todos += revisar(system, CODIGO)
# merge en código: dedupe por (linea, tema), ordenar por severidad
orden = {"alta": 0, "media": 1, "baja": 2}
unicos = {(h["linea"], h["tema"]): h for h in todos}.values()
for h in sorted(unicos, key=lambda h: orden[h["severidad"]]):
    print(h["severidad"], h["tema"], "|", h["descripcion"])
```

Corré `python b.py` 2 o 3 veces y marcá los 6 bugs.

6. **Rompelo a propósito.** En `b.py`, reemplazá los ejemplos de `seguridad` por los de `api`. Corré. ¿La pasada de seguridad empieza a hablar de URLs? Eso es lo que pasa con ejemplos que no son del tema.

7. **Segundo error clásico.** En `a.py`, agregá al system: `Sé conservador y reportá solo issues de severidad alta.` ¿Cuántos de los 6 bugs quedan?

## Cómo sabés que salió bien

- B encuentra de forma más pareja los bugs de los tres temas que A (en especial los de negocio y seguridad).
- La salida de B sale ordenada por severidad y sin duplicados, porque el merge lo hace tu código.
- Paso 6: con ejemplos de API, la pasada de seguridad se desvía.
- Paso 7: compará cuántos bugs reales quedan. La doc de Opus 5 avisa que con "only report high-severity issues" o "be conservative" el modelo "might follow that instruction literally and report less" (el lab usa Opus 5.5: medilo vos).

## Si algo falla

- **`stop_reason` es `max_tokens`**: el thinking cuenta para `max_tokens`. Subilo (por ejemplo a 12000) en `comun.py`.
- **Error 400 por el schema**: revisá que cada objeto tenga `"additionalProperties": False` y que los `enum` sean strings.
- **A y B dan casi lo mismo**: con un código chico el modelo puede encontrar todo igual. Duplicá `CODIGO` con más funciones o agregá más bugs; la diferencia aparece cuando el prompt único tiene que cubrir mucho.
- **El `tema` sale con otra mayúscula**: la doc avisa que structured outputs no garantiza la capitalización de enums. Comparalo con `.lower()`.
- **PowerShell no deja ejecutar `Activate.ps1`** ("la ejecución de scripts está deshabilitada en este sistema"): corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, contestá que sí y volvé a correr `.\.venv\Scripts\Activate.ps1`.
- **`py` no se reconoce como comando**: instalá Python para Windows desde python.org (trae el launcher `py`) y abrí una ventana nueva de PowerShell.
- **Abriste otra ventana de PowerShell y nada anda**: `$env:ANTHROPIC_API_KEY` y el venv duran solo esa sesión. En la ventana nueva, entrá a la carpeta del lab, activá el venv y volvé a cargar la key.
