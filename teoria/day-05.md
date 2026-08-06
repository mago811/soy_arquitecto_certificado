---
dia: 5
titulo: Schemas de extracción anti-fabricación
duracion: 1.5h
---

## 📱 Pregunta de apertura · 5 min

**Un pipeline extrae datos de facturas con una tool y JSON schema. Cuando la factura no trae CUIT, el modelo devuelve uno inventado con formato perfecto que pasa la validación. El tech lead propone: "marquemos todos los campos como required, así nos aseguramos completitud". ¿Cuál es el fix?**

- A) Aceptar la propuesta: con todos los campos required el output siempre está completo
- B) Agregar additionalProperties: false y strict: true para que el schema se valide siempre
- C) Tipos nullable (`["string","null"]`) con descriptions que digan "si no está en el documento, devolvé null"
- D) Pedirle en el prompt que no invente datos bajo ninguna circunstancia

Elegí antes de seguir. La respuesta está al final del brief.

## 📱 El principio · 10 min

**"required obliga a que el campo APAREZCA; no dice nada sobre si el valor es VERDADERO."**

Ante un documento incompleto, un campo required no-nullable deja al modelo sin salida legal para decir "no está": el schema lo OBLIGA a poner algo, y ese algo lo fabrica — con formato impecable, que es lo peor, porque pasa cualquier validación. "Todos los campos required para asegurar completitud" es EL distractor del examen (y el que te volteó en el primer intento).

Anti-fabricación = darle al modelo una forma válida de decir "no está en el documento":

- **nullable** (`"type": ["string", "null"]`): null pasa a ser una respuesta legal del schema.
- **enum**: valores cerrados; el modelo no puede inventar categorías fuera de la lista.
- **descriptions** de campo: explícitas — "si no aparece en el documento, devolvé null".

El combo completo del principio de oro 3: **nullable + enums + few-shot con nulls**. El few-shot lo profundizamos mañana (día 6); hoy dominás el schema.

Traducción a tu mundo OT: required no-nullable es el formulario que no te deja avanzar sin llenar el campo — el operador apurado termina tipeando cualquier cosa. nullable es el checkbox "dato no disponible": queda registrado que falta, en vez de un valor trucho en la base.

## 📱 Escenarios de examen · 20 min

**E1 — El CUIT fantasma.** Extractor de facturas, todos los campos required tipo string. Facturas sin CUIT → CUITs inventados válidos en formato. Fix: **`["string","null"]` + description "si no está, devolvé null"**. Por qué: el modelo respeta el contrato; si el contrato no admite ausencia, la fabricación es la única jugada legal que le queda.

**E2 — Optional que rompe la auditoría.** Para frenar los inventos, un equipo sacó los campos del array `required`. Ahora algunos outputs vienen sin el campo y nadie sabe si el dato no estaba en el documento o el modelo se lo olvidó. Fix: **required + nullable** — el campo aparece SIEMPRE y null es la señal explícita de ausencia. Optional = ausencia ambigua; para extracción auditable, perdés trazabilidad.

**E3 — Categorías creativas.** Clasificador de tickets con `categoria` como string libre → aparecen "hardware-critico" y "red-urgente", que no existen en el sistema y rompen el tablero. Fix: **enum** con las categorías válidas. Con el espacio de valores cerrado no hay invento posible; si necesitás escape, agregá "otros" AL enum.

**E4 — strict no salva.** Un dev agregó `strict: true` y `additionalProperties: false` y el modelo sigue inventando fechas. Por qué: eso valida **ESTRUCTURA** (claves declaradas, tipos correctos, forma del JSON), no **VERACIDAD**. Una fecha inventada con el tipo correcto pasa strict feliz. La veracidad se ataca con nullable + enum + few-shot.

**E5 — Logs truncados del firewall.** Extractor de eventos OT sobre logs cortados: fabrica `accion: "blocked"` que el log no registró e IPs de origen que no aparecen. Fix: **enum para accion** (allow/deny/drop — lo que el firewall realmente emite) y **nullable para ip_origen**. Mismo combo, tu dominio.

## 📱 Matriz de decisión · 10 min

| Mecanismo | Qué controla | Qué NO controla | Trampa de examen |
|---|---|---|---|
| required | que el campo aparezca en el output | que el valor sea real | "required = completitud" → fuerza fabricación en docs incompletos |
| optional (fuera de required) | el campo puede faltar | ausencia ambigua: ¿no estaba o se lo olvidó? | suena anti-fabricación pero rompe la auditoría |
| nullable (`"type": [X,"null"]`) | null es un valor válido | nada más — si es required, el campo sigue apareciendo | confundirlo con optional: son cosas distintas |
| enum | el valor sale de una lista cerrada | campos sin enum | creer que la lista en el prompt alcanza |
| additionalProperties: false / strict: true | forma del JSON: claves y tipos | veracidad de los valores | "strict evita inventos" — valida estructura, no verdad |

Patrón de extracción auditable: **required + nullable en todos los campos extraíbles**. El campo siempre está, y null significa exactamente "no estaba en el documento". Ni fabricación ni ambigüedad.

## 💻 Lab · 30 min

Abrí `labs/day-05-schemas.md` en la PC: vas a ver al extractor inventar un CUIT y una fecha con tus propios ojos, y lo vas a arreglar con nullable + enum + descriptions — y después romperlo de nuevo a propósito.

## 📱 Quiz del día · 15 min

Quiz **day-05** en la pestaña Quizzes del dashboard — alimenta el objetivo `extraction-schemas` del semáforo.

## 📱 Respuesta de apertura

**C.** Nullable con descriptions le da al modelo la salida legal: "no está" se vuelve una respuesta válida del schema. A es el distractor exacto que hay que oler a distancia: required fuerza a que el campo aparezca, y sin null el modelo rellena → fabrica. B valida estructura, no veracidad. D ayuda (y suma), pero el prompt es guidance: el contrato duro es el schema.
