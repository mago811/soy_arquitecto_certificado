---
objective: 8
title: "¿Plan mode, ejecución directa o multi-fase? Elegir según tamaño, riesgo y aprobación"
rule: "Chico y claro → directo. Grande, desconocido o riesgoso → plan mode (nada se edita hasta aprobar). Requisitos difusos o cambio masivo → multi-fase: spec, implementación en sesión nueva, review independiente."
sources:
  - url: https://code.claude.com/docs/en/permission-modes
    title: "Choose a permission mode"
  - url: https://code.claude.com/docs/en/common-workflows
    title: "Common workflows"
  - url: https://code.claude.com/docs/en/costs
    title: "Manage costs effectively"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
  - url: https://code.claude.com/docs/en/commands
    title: "Commands"
status: no_verificado
---

## Qué es

Hay tres formas de encarar una tarea con Claude Code:

| Arquitectura | Cómo funciona | Cuándo |
|---|---|---|
| **Ejecución directa** | Claude edita apenas entiende. Por ejemplo, `-p` con `acceptEdits` o `--allowedTools "Edit"` | Cambio chico, claro, fácil de revertir |
| **Plan mode** | Claude lee, explora y propone. **No edita** hasta que aprobás | Cambio grande, código desconocido, riesgo alto |
| **Multi-fase** | Fases separadas: spec → implementación (sesión nueva) → review independiente | Requisitos difusos, cambios masivos, review que tiene que ser imparcial |

## Cuándo se usa

**Plan mode.** La doc lo resume en dos frases:
- "For changes you want to review before they touch disk, switch to plan mode."
- "Use plan mode for complex tasks ... preventing expensive re-work when the initial direction is wrong."

Cómo se activa: `Shift+Tab`, `/plan` delante de un prompt, o `claude --permission-mode plan`. Para que un proyecto arranque siempre en plan: `"defaultMode": "plan"` en `.claude/settings.json`.

Al aprobar, elegís cómo sigue:
- **"Yes, and use auto mode"**: Claude ejecuta sin frenar en cada paso.
- **"Yes, manually approve edits"**: revisás cada edición una por una. Sirve cuando el riesgo es alto.
- **"No, keep planning"**: Claude ajusta el plan.

Con `Ctrl+G` editás el plan vos mismo antes de aprobar.

**Multi-fase.** Tres ejemplos de la doc:
1. **Spec primero:** Claude te entrevista y escribe `SPEC.md`. Después arrancás una sesión **nueva** para construir, "with a clean context and a written definition of done".
2. **Review independiente:** `/code-review` revisa "in a fresh subagent that never saw your conversation". No lo contamina el razonamiento que produjo el código.
3. **`/batch`:** investiga, parte el trabajo en 5 a 30 unidades, te muestra el plan. Cuando lo aprobás, lanza un subagente por unidad en su propio worktree.

## El error típico que el examen quiere que cometas

- **Plan mode para todo.** Un typo en el README no necesita plan ni aprobación. Es costo y espera sin beneficio.
- **Ejecución directa en lo riesgoso.** "Migrá la autenticación de 40 archivos" con `bypassPermissions`. Si arranca mal, el rework sale caro.
- **Aprobación humana pedida por texto.** "En CLAUDE.md: pedí permiso antes de editar". Es guidance. Plan mode bloquea las ediciones de verdad: "edits stay blocked until you approve the plan".
- **Plan mode en CI esperando que edite.** En `-p`, plan mode "keeps its blocks". La corrida devuelve un plan y no cambia nada. Si querés plan + aprobación en CI, son **dos fases**: una corrida que planifica, una persona que aprueba, y otra corrida que ejecuta.
- **Que el mismo que escribió el código lo apruebe.** La review tiene que ser independiente. Y el merge lo decide una persona o la protección de rama. Code Review "never approves or blocks the pull request".

## Ejemplo

Tres pedidos en la misma empresa:

1. **"Cambiá 'recieve' por 'receive' en README.md."**
   → Directo: `claude -p "..." --allowedTools "Edit"`. Riesgo casi nulo.

2. **"Pasá el servicio de pagos de sesiones a JWT."** Código que nadie conoce bien, plata real.
   → Plan mode. Leés el plan, lo corregís con `Ctrl+G` y aprobás con "Yes, manually approve edits".

3. **"Agregá rate limiting a la API pública"**, sin requisitos claros.
   → Multi-fase. Primero entrevista y `SPEC.md`. Después sesión nueva que implementa. Al final, un subagente que revisa el diff contra `SPEC.md`. Merge con aprobación humana.

## Para recordar

| Señal en el escenario | Arquitectura |
|---|---|
| "una línea", "typo", "trivial", "fácil de revertir" | Ejecución directa |
| "muchos archivos", "no conocemos el código", "producción", "aprobación antes de tocar disco" | Plan mode |
| "requisitos poco claros", "cientos de archivos", "review imparcial", "fases" | Multi-fase |
| "tiene que aprobar un humano" | Algo que **bloquee** (plan mode, protección de rama), no un pedido en CLAUDE.md |
