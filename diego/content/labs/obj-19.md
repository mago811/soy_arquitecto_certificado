---
objective: 19
title: "Lab: de \"una cifra segura\" a un informe que muestra el desacuerdo"
minutes: 50
needs: ["API key de Anthropic", "Python 3.10+"]
sources:
  - url: https://platform.claude.com/docs/en/build-with-claude/citations
    title: "Citations"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
    title: "Reduce hallucinations"
  - url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
    title: "Prompting best practices"
status: no_verificado
---

## Objetivo

Ver con tus ojos cómo un prompt ingenuo **colapsa** datos en conflicto en una sola frase segura, y arreglarlo con: permiso para decir "no sé", secciones establecido/disputado, Citations API y una pasada de verificación.

## Pasos

### 0. Preparar (5 min)

```bash
mkdir lab-obj19 && cd lab-obj19
python3 -m venv .venv && source .venv/bin/activate
pip install anthropic
export ANTHROPIC_API_KEY="tu-key"
```

### 1. Tres fuentes inventadas que no coinciden (5 min)

Creá `fuentes.py`. Los datos son de juguete: una de las diferencias es real y la otra es solo de fecha.

```python
FUENTES = [
    {"title": "Informe de la Cámara de Software 2024",
     "context": "Fecha de publicación: 2024-03. Tipo: informe sectorial.",
     "data": "En 2023 el 41% de las pymes del país usaba al menos una herramienta de IA. El mercado local de IA se estimó en USD 4.200 millones."},
    {"title": "Encuesta oficial de estadística 2024",
     "context": "Fecha de publicación: 2024-06. Tipo: estadística oficial.",
     "data": "El mercado local de servicios de IA alcanzó USD 3.100 millones en 2023, según la encuesta a 2.000 empresas."},
    {"title": "Estudio universitario 2019",
     "context": "Fecha de publicación: 2019-11. Tipo: paper académico.",
     "data": "En 2019 solo el 12% de las pymes usaba herramientas de IA."},
]
```

### 2. El bug: prompt ingenuo (8 min)

Creá `ingenuo.py`:

```python
import anthropic
from fuentes import FUENTES

client = anthropic.Anthropic()
docs = "\n\n".join(f"<document><source>{f['title']}</source><document_content>{f['data']}</document_content></document>" for f in FUENTES)

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=4000,
    messages=[{"role": "user", "content": f"{docs}\n\nEn UNA frase: ¿cuánto vale el mercado de IA y qué porcentaje de pymes usa IA?"}],
)
print("".join(b.text for b in response.content if b.type == "text"))
```

`max_tokens` va en 4000 porque el thinking del modelo también cuenta para ese límite. Corré `python ingenuo.py`. Anotá: ¿eligió un número? ¿promedió? ¿dijo que 12% y 41% "se contradicen"? Ese es el bug que el examen te pide arreglar.

### 3. El fix: secciones + "no sé" + Citations (15 min)

Creá `sintesis.py`. Cada documento lleva `citations: {"enabled": True}` (tiene que estar en **todos** o en ninguno) y la fecha va en `context`, que el modelo lee pero no se usa como texto citable.

```python
import anthropic
from fuentes import FUENTES

client = anthropic.Anthropic()

contenido = [
    {
        "type": "document",
        "source": {"type": "text", "media_type": "text/plain", "data": f["data"]},
        "title": f["title"],
        "context": f["context"],
        "citations": {"enabled": True},
    }
    for f in FUENTES
]
contenido.append({"type": "text", "text": """Usá SOLO la información de los documentos, no tu conocimiento general.
Armá un informe con tres secciones:
1. Hallazgos establecidos (los respaldan dos o más fuentes).
2. En disputa: si las fuentes no coinciden, mostrá cada valor con su fuente y su fecha. No elijas uno ni promedies.
3. Sin datos suficientes: escribí "No hay información suficiente" para lo que no se puede responder.
Tené en cuenta las fechas: datos de años distintos pueden no contradecirse.
Preguntas: ¿cuánto vale el mercado local de IA? ¿qué porcentaje de pymes usa IA hoy? ¿cuál es el mercado en Uruguay?"""})

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=8000,
    messages=[{"role": "user", "content": contenido}],
)

for block in response.content:
    if block.type != "text":
        continue
    print(block.text, end="")
    for c in (block.citations or []):
        print(f"  [cita: \"{c.cited_text.strip()}\" — {c.document_title}]", end="")
print()
```

Corré `python sintesis.py`. Buscá:
- USD 4.200 M y USD 3.100 M en **En disputa**, cada uno con su fuente.
- 12% (2019) y 41% (2023) explicados como **cambio en el tiempo**, no como contradicción.
- "Uruguay" en **Sin datos suficientes**.
- Cada afirmación con su `[cita: …]`.

### 4. Pasada de verificación (10 min)

Agregá al final de `sintesis.py`:

```python
informe = "".join(b.text for b in response.content if b.type == "text")
verif = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=8000,
    messages=[{"role": "user", "content": contenido[:-1] + [{"type": "text", "text": f"""<informe>{informe}</informe>
Revisá cada afirmación del informe. Para cada una, encontrá una cita textual de los documentos que la respalde.
Si no encontrás cita, sacá la afirmación y marcá dónde estaba con []. Devolvé el informe corregido."""}]}],
)
print("\n--- VERIFICADO ---")
print("".join(b.text for b in verif.content if b.type == "text"))
```

### 5. Best-of-N (7 min)

Corré `python ingenuo.py` tres veces seguidas y anotá la cifra que da cada vez. Si cambia, es la señal que la doc describe: inconsistencias entre corridas pueden indicar alucinación. Corré `sintesis.py` dos veces: la sección "En disputa" debería mostrar los mismos dos valores.

## Cómo sabés que salió bien

- `ingenuo.py` produce una frase "segura" que esconde el conflicto (o lo confunde con el cambio temporal).
- `sintesis.py` separa establecido / en disputa / sin datos, y muestra citas con `cited_text` y `document_title`.
- La pasada de verificación no agrega datos nuevos; si algo no tenía cita, aparece `[]`.
- Podés explicar en una frase por qué "promediar 3.650 M" es incorrecto.

## Si algo falla

- **Error 400 al agregar `output_config`:** Citations no se combina con structured outputs. Sacá uno de los dos.
- **Error de citations:** revisá que `citations.enabled` esté en **todos** los documentos del request.
- **No ves citas:** si el prompt pide "solo JSON", la doc avisa que puede haber pocas o ninguna cita. Pedí texto.
- **`AttributeError` con `block.citations`:** solo los bloques `text` tienen citas; el filtro `block.type != "text"` saltea los bloques de thinking.
- **Respuesta cortada (`stop_reason: "max_tokens"`):** subí `max_tokens`; recordá que el thinking también lo consume.
