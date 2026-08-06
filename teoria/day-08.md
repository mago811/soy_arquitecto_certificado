---
dia: 8
titulo: "MCP profundo: errores, descriptions, auth"
duracion: 2h
---

## 📱 Pregunta de apertura · 5 min

**Tu MCP server de inventario, ante una IP inexistente, devuelve el stack trace completo de Python (KeyError + 40 líneas). Claude lo recibe, pide disculpas y abandona la tarea. ¿Cuál es el fix?**

- A) Reintentar automáticamente 10 veces dentro del server antes de responder
- B) Devolver un tool result marcado `is_error: true` con un mensaje accionable: qué falló y cómo seguir
- C) Atrapar la excepción y devolver un string vacío para no confundir al modelo
- D) Terminar el proceso del server con exit code 1 para que Claude Code lo reinicie limpio

Elegí antes de seguir. La respuesta está al final.

## 📱 El principio · 15 min

**El modelo solo ve texto. Vos diseñás dos canales: la description (antes de llamar) y el error (después de fallar).**

1. **Antes de llamar:** el modelo elige la tool leyendo **name + description + schema de inputs**. NO lee el código del server, por prolijo que esté. Dos tools parecidas con descriptions vagas → elección incorrecta o argumentos con formato equivocado. La description buena dice: **cuándo usar esta tool, qué la diferencia de la parecida, y qué formato tienen los inputs**.

2. **Después de fallar:** una tool que falla devuelve un tool result con **`is_error: true`** y un mensaje **estructurado y accionable**: qué falló + cómo seguir ("rate limit: reintentá en 60s", "id 4512 no existe: verificá con listar_pedidos"). El modelo usa ese texto para decidir el próximo paso — reintentar, cambiar de tool, avisar al humano. Un stack trace crudo no da próximo paso (y filtra paths internos); un string vacío es peor: el agente concluye "no había datos" y fabrica. Y el server **nunca se cae** por un error de tool: en el SDK de Python, una excepción común se convierte sola en `is_error` con su mensaje.

3. **Auth:** credenciales por **env vars** — referencia `${VAR}` en `.mcp.json` o env del proceso del server —, jamás literales en config ni en código versionado (la mecánica de `${VAR}` ya la viste: ver teoria/day-02.md).

4. **Debugging:** `claude mcp list` (qué servers hay y su estado) y `claude mcp get <nombre>` (detalle de uno: comando, args, env, scope). Primero mirar, después tocar.

## 📱 Escenarios de examen · 30 min

**E1 — El traceback que paraliza.** Server de tickets: ante un id inexistente escupe el stack trace; el agente reintenta la MISMA llamada tres veces y abandona. Fix: try/except que devuelva error tipado con `is_error` y mensaje con siguiente paso ("id 9922 no existe: usá listar_tickets para ver ids válidos"). Por qué: con ese texto el modelo encadena la tool correcta solo; con el traceback no hay nada que decidir.

**E2 — Las mellizas.** `buscar_activo_por_ip` y `buscar_activo_por_nombre`, ambas con description "busca activos". El modelo llama por_nombre pasándole una IP. Fix: descriptions que desambiguan — "Devuelve el activo dada su IP exacta (formato x.x.x.x); usala cuando tenés la IP" vs "…dado su nombre (ej: PLC-Linea-1); usala cuando tenés el nombre". Renombrar la tool sin mejorar la description no arregla nada.

**E3 — El token en el repo.** `.mcp.json` (o el código Python del server) con `API_KEY = "sk-live-…"` versionado. Fix doble: rotar el secret comprometido YA, y pasar a env var — `${API_KEY}` en la config, `os.environ` en el código. CLAUDE.md tampoco es lugar para secrets: es contexto, no una bóveda.

**E4 — El 429 silencioso.** La API upstream devuelve rate limit; el server lo atrapa y responde lista vacía. El agente concluye "no hay resultados" y entrega un informe falso. Fix: `is_error` con "rate limit: reintentá en 60s" — el modelo espera, reintenta o informa la limitación. Reintentar 10 veces adentro del server esconde el problema y suma latencia sin que el modelo pueda decidir.

**E5 — "Está configurado pero no aparece".** Las tools de un server no están en la sesión. Antes de re-agregar a ciegas: `claude mcp list` (¿figura? ¿en qué estado?), `claude mcp get <nombre>` (comando, args, env — ¿la variable referenciada existe en TU entorno?).

## 📱 Matriz de decisión · 10 min

| Síntoma | Causa | Fix |
|---|---|---|
| El agente abandona o repite la misma llamada tras un fallo | error crudo (traceback) o vacío, sin próximo paso | `is_error: true` + mensaje accionable (qué falló + cómo seguir) |
| Elige la tool equivocada o pasa args con mal formato | descriptions vagas o casi idénticas | descriptions con cuándo-usar, diferencia y formato de inputs |
| Secret aparece en un diff | credencial literal en config o código | env vars: `${VAR}` en `.mcp.json` / env del proceso + rotar |
| Server configurado pero sus tools no aparecen | proceso caído, comando mal, env var sin definir | `claude mcp list` → `claude mcp get <nombre>` |

Trampas: 1) el modelo NO lee el código del server — solo name/description/schema. 2) Reintentos automáticos server-side esconden el error de quien decide: el modelo. 3) Un error de tool es un RESULTADO (`is_error`), no un crash: el server sigue vivo. 4) String vacío ante un fallo = datos fabricados aguas abajo. 5) El stack trace además filtra información interna.

## 💻 Lab · 40 min

Abrí `labs/day-08-mcp-profundo.md` en la PC: un server de inventario OT con dos tools mellizas — lo rompés y lo arreglás en las tres dimensiones (descriptions, errores, auth).

## 📱 Quiz del día · 20 min

Quiz **day-08** en la pestaña Quizzes — alimenta `mcp-advanced` en el semáforo.

## 📱 Respuesta de apertura

**B.** El error es información PARA el modelo: `is_error: true` + "qué falló y cómo seguir" le permite decidir el próximo paso. A reintenta a ciegas algo que quizás nunca funcione y esconde el fallo. C es fabricación garantizada: "vacío" se lee como "no hay datos". D mata todas las tools del server por un error de una.
