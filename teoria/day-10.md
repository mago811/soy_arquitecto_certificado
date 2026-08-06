---
dia: 10
titulo: Exploración de codebase + session resumption
duracion: 1.5h
---

## 📱 Pregunta de apertura · 5 min

**"¿Dónde se valida el JWT en este repo de 400 archivos?" Un dev configuró a Claude Code para que primero lea todos los archivos de src/ "y tenga contexto completo". A mitad de la lectura el contexto está lleno, y la respuesta llega diluida y carísima. ¿Cuál es el fix?**

- A) Pegar el codebase entero en el primer mensaje para que no falte nada
- B) Leer solo los primeros 50 archivos y extrapolar el resto
- C) Glob para ubicar candidatos por nombre, Grep para buscar jwt/verify en ellos, Read solo sobre los que matchearon
- D) Pasar a un modelo con ventana de contexto más grande y seguir leyendo todo

Elegí antes de seguir. La respuesta está al final del brief.

## 📱 El principio · 15 min

**"De lo amplio a lo específico: Glob → Grep → Read."**

**Glob** encuentra archivos por patrón de nombre — barato, ni abre el contenido. **Grep** busca contenido por regex sobre un conjunto acotado — costo medio, devuelve líneas, no archivos. **Read** carga el archivo completo al contexto — caro, y cada token que entra diluye al resto (ver teoria/day-02.md sobre contexto). La secuencia correcta paga lo caro solo cuando lo barato ya acotó el blanco. El anti-patrón de examen es siempre el mismo: **empezar por Read** ("leé todo para tener contexto") o volcar el repo entero al prompt.

Y cuando la sesión se corta, no se re-explica: **`claude --continue`** retoma la última sesión del directorio y **`claude --resume`** deja elegir entre sesiones previas. Ambos recuperan el **historial completo de la conversación** — la alternativa correcta a la sesión nueva con resumen pegado a mano.

## 📱 Escenarios de examen · 35 min

**E1 — "Leé todo primero".** Agente que arranca leyendo cada archivo de src/ antes de responder nada: contexto lleno, respuestas diluidas. Fix: **exploración incremental** — Glob acota por nombre, Grep filtra por contenido, Read solo sobre lo confirmado. Por qué: el contexto es señal finita; llenarlo con archivos irrelevantes entierra la pregunta.

**E2 — Grep sin acotar.** Un Grep de "config" sobre el repo completo devuelve cientos de matches en node_modules y dist. Fix: **Glob primero** (patrón de nombre o tipo de archivo) y Grep solo sobre ese conjunto. Por qué: el orden amplio→específico también ordena las herramientas baratas entre sí; buscar contenido sin acotar archivos es ruido.

**E3 — La sesión cortada.** Refactor a medias, se cerró la terminal. Al día siguiente el dev abre una sesión nueva y re-explica en tres párrafos; Claude igual no recuerda las decisiones finas. Fix: **`claude --continue`** — retoma la última sesión del directorio con el historial completo. Nada que re-explicar, nada que se pierda.

**E4 — ¿Cuál de todas?** En el mismo repo hubo sesiones de auth, de billing y de tests. Hay que retomar la de billing, que no fue la última. Fix: **`claude --resume`**, que lista las sesiones previas para elegir. `--continue` solo agarra la última: acá elegiría mal.

**E5 — "Pegá el repo en el prompt".** Para "darle contexto completo", un script concatena el codebase y lo pega al inicio de cada request. Las respuestas empeoran y el costo explota. Fix: sacar el volcado y explorar incremental. Por qué: más contexto no es más precisión — lo relevante se busca, no se vuelca.

## 📱 Matriz de decisión · 15 min

| Herramienta | Costo | Cuándo |
|---|---|---|
| Glob | Barato (solo nombres) | Primer paso: ubicar candidatos por patrón (`**/*.ts`, `config*`) |
| Grep | Medio (contenido por regex, devuelve líneas) | Filtrar los candidatos por lo que contienen |
| Read | Caro (archivo completo al contexto) | Último paso, solo archivos ya confirmados |
| `claude --continue` | — | Retomar la última sesión del directorio |
| `claude --resume` | — | Elegir entre varias sesiones previas |

Trampas conocidas: 1) "leé todos los archivos primero para tener contexto completo" — EL distractor: quema contexto antes de saber qué buscás. 2) "pegá el codebase entero en el prompt" — misma trampa con otro disfraz. 3) "Grep antes que Glob siempre" — sin acotar el conjunto, Grep devuelve ruido de dependencias y builds. 4) "abrí una sesión nueva y re-explicá" — `--continue`/`--resume` retoman el historial completo; el resumen manual pierde detalle. 5) "más ventana de contexto" no arregla mala exploración: diluye igual, pero más caro.

## 📱 Quiz del día · 20 min

Quiz **day-10** en la pestaña Quizzes del dashboard — alimenta el objetivo `exploration` del semáforo.

## 📱 Respuesta de apertura

**C.** De lo amplio a lo específico: Glob ubica candidatos sin gastar contexto, Grep confirma cuáles hablan de JWT, y Read se paga solo sobre esos. A es la misma falla amplificada; B extrapola sobre archivos arbitrarios (la validación puede estar justo en el 51); D compra una ventana más grande para seguir diluyendo — más caro, no más preciso.
