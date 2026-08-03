---
dia: 1
titulo: Enforcement vs guidance
duracion: 2h
---

## 📱 Pregunta de apertura · 5 min

**El equipo de infra prohibió que Claude Code ejecute `terraform apply`: lo escribieron en CLAUDE.md, en mayúsculas y con IMPORTANT. Tres semanas después, en una sesión larga de refactor, Claude lo ejecutó igual. ¿Cuál es el fix?**

- A) Repetir la regla como primer mensaje de cada sesión
- B) Moverla al tope del CLAUDE.md con ejemplos de lo que NO hay que hacer
- C) Agregar una regla deny para `Bash(terraform apply*)` en permissions de settings.json
- D) Bajar la temperatura para que el modelo respete más las instrucciones

Elegí antes de seguir. La respuesta está al final del brief.

## 📱 El principio · 15 min

**"Guidance le habla al modelo; enforcement se ejecuta fuera del modelo."**

Todo lo que va en CLAUDE.md, system prompts o mensajes es **contexto**: el modelo lo pondera junto con todo lo demás, y en sesiones largas esa ponderación se diluye. Puede fallar — no seguido, pero puede. **Enforcement** (permissions y hooks) corre en el harness de Claude Code, determinísticamente, en cada tool call: al modelo ni le preguntan.

Traducción a tu mundo OT: CLAUDE.md es el cartel de "prohibido pasar"; un deny o un hook es la regla del firewall. El cartel educa y casi todos lo respetan; la regla dropea el paquete siempre, aunque nadie haya leído el cartel.

Palabras gatillo del examen: **"siempre", "nunca", "sin excepciones", "compliance", "auditoría", "política de la empresa"** → enforcement. **"Preferimos", "convención", "estilo", "en general"** → guidance.

## 📱 Escenarios de examen · 30 min

**E1 — La regla ignorada.** Política en CLAUDE.md, sesión larga, regla violada. Fix: **deny en permissions**. Por qué: el deny se evalúa en el harness en cada tool call; no existe "contexto diluido" que lo debilite.

**E2 — "Formatear siempre después de editar".** CLAUDE.md lo pide y a veces no pasa. Fix: **hook PostToolUse** sobre Edit/Write que corre prettier. Por qué: acción que debe ocurrir siempre DESPUÉS del cambio → hook post. PreToolUse acá es el distractor: se equivoca de momento (formatearía el archivo viejo).

**E3 — Bloqueo condicional.** "`npm publish` solo desde main y con CHANGELOG actualizado." permissions no puede: sus reglas son patrones estáticos. Fix: **hook PreToolUse** que evalúa la condición y devuelve **exit 2** (bloquea el tool; el stderr le llega a Claude como feedback). Regla: condición → hook; patrón fijo → deny.

**E4 — Confirmación humana.** "Deploy a prod solo con aprobación en el momento, sin prohibirlo del todo." Fix: **regla ask**. deny bloquea de más; CLAUDE.md promete de menos.

**E5 — La trampa invertida.** "Preferimos nuestro logger interno a console.log, con excepciones legítimas (scripts, debugging)." Fix: **CLAUDE.md**. Un hook que bloquee console.log genera falsos positivos y frena trabajo válido. No todo es enforcement: preferencia con excepciones = guidance.

## 📱 Matriz de decisión · 10 min

| Mecanismo | Qué es | Usalo cuando | ¿Garantiza? |
|---|---|---|---|
| CLAUDE.md / prompts | contexto (guidance) | convenciones, estilo, arquitectura | No |
| permissions allow / ask / deny | patrones estáticos `Tool(patrón)` | permitir / confirmar / bloquear acciones concretas | Sí (deny gana a allow) |
| hook PreToolUse | comando ANTES del tool | bloqueo con lógica condicional — exit 2 bloquea y stderr va a Claude | Sí |
| hook PostToolUse | comando DESPUÉS del tool | reaccionar siempre: formatear, loguear, testear | Sí, pero el tool ya corrió |

Jerarquía de settings (mayor → menor precedencia): **enterprise (managed) → argumentos de CLI → `.claude/settings.local.json`** (personal del proyecto, no versionado) **→ `.claude/settings.json`** (compartido en el repo) **→ `~/.claude/settings.json`** (personal global).

Trampas conocidas: 1) "ponelo en CLAUDE.md, que ahí van las instrucciones" — si el escenario dice compliance, es EL distractor. 2) PostToolUse no previene: llega tarde. 3) exit 1 no bloquea; el que bloquea es **exit 2**. 4) ask ≠ deny: confirmar no es prohibir. 5) allow no hace que algo ocurra: permitir no es garantizar.

## 💻 Lab · 40 min

Abrí `labs/day-01-enforcement.md` en la PC: vas a ver fallar la regla de CLAUDE.md con tus propios ojos y a bloquearla dos veces (deny y hook).

## 📱 Quiz del día · 20 min

Quiz **day-01** en la pestaña Quizzes del dashboard — alimenta el objetivo `enforcement` del semáforo.

## 📱 Respuesta de apertura

**C.** "Prohibido" sin excepciones = enforcement: el deny se evalúa fuera del modelo y bloquea el comando siempre, sin importar cuánto contexto haya. A y B siguen siendo guidance (fallan igual en sesiones largas); D: la temperatura no gobierna la adherencia a instrucciones.
