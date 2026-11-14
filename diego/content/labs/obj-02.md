---
objective: 2
title: "Lab: nombrar, retomar, avisar qué cambió y forkear una sesión"
minutes: 30
needs: ["Claude Code", "git", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/sessions
    title: "Manage sessions"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/commands
    title: "Commands"
  - url: https://code.claude.com/docs/en/agent-sdk/sessions
    title: "Work with sessions (Agent SDK)"
status: verificada
---

## Objetivo

Ver con tus ojos que una sesión retomada **recuerda los archivos como estaban**, arreglarlo con re-análisis dirigido, y separar una alternativa con fork sin tocar la sesión original.

## Pasos

### 1. Proyecto de juguete (3 min)

En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj02
Set-Location lab-obj02
git init
New-Item -ItemType Directory -Force pagos
code pagos\refund.js
```

(Si no usás VS Code, cambiá `code` por `notepad`.) Pegá en `pagos\refund.js` y guardá:

```javascript
export function refund(amount) {
  if (amount > 500) throw new Error("requiere aprobación");
  return { ok: true, amount };
}
```

Después `code pagos\fees.js` y pegá:

```javascript
export const FEE = 0.03;
```

Commiteá:

```powershell
git add .
git commit -m "inicial"
```

### 2. Sesión con nombre (5 min)

```powershell
claude -n pagos-audit
```

Pedile: `Leé pagos/ y resumime las reglas de negocio en 3 bullets.` Anotá lo que dice del límite de 500. Salí con `/exit`.

### 3. Alguien cambia el código "por fuera" (2 min)

Con Claude cerrado, abrí `code pagos\refund.js`, cambiá `500` por `1000` y guardá. Después commiteá desde PowerShell:

```powershell
git commit -am "sube límite a 1000"
git log -1 -p
```

`git log -1 -p` te muestra el cambio: una línea con `500` que sale y otra con `1000` que entra.

### 4. El error: retomar sin avisar (5 min)

```powershell
claude --resume pagos-audit
```

Preguntale: `Sin leer nada, ¿cuál es el límite de refund?` Va a decir 500: lo tiene en el historial. **Eso es un tool result viejo**: la sesión guarda la conversación, no el filesystem. Salí.

### 5. El fix: re-análisis dirigido (5 min)

```powershell
claude --resume pagos-audit
```

```text
Desde tu análisis cambió SOLO pagos/refund.js (mirá `git log -1 -p`).
Releé solo ese archivo y decime qué bullets de tu resumen siguen válidos.
No vuelvas a leer fees.js.
```

Fijate en el transcript que lee `refund.js` y no `fees.js`.

### 6. Fork: probar otra idea sin ensuciar la original (7 min)

En la misma sesión corré `/branch alternativa-cola`. Pedí: `Proponé reemplazar el throw por encolar el refund para aprobación manual. Solo el diseño, no edites.`

Después `/resume pagos-audit` y preguntá: `¿Hablamos de una cola de aprobación?` La original no lo sabe.

Lo mismo desde la terminal: `claude --resume pagos-audit --fork-session`.

### 7. Cuándo NO retomar (3 min)

Imaginá que cambiaron 30 archivos. Abrí `code RESUMEN.md` y escribí ahí lo que inyectarías en una sesión nueva: decisiones, archivos clave, pendientes. Abrí `claude` (sin resume) y empezá con `Leé RESUMEN.md y git log -5 antes de nada.`

## Cómo sabés que salió bien

- En el paso 4 la respuesta usa el valor viejo (500).
- En el paso 5 corrige a 1000 y solo relee `refund.js`.
- En el paso 6, el `/branch` imprime dos IDs (rama y original) y la original no conoce la idea de la cola.
- `claude --resume` sin argumentos muestra `pagos-audit` y la rama como filas separadas en el picker.

## Si algo falla

- `claude --resume pagos-audit` abre el picker en vez de la sesión: el nombre es ambiguo o no coincide exacto. Elegila en la lista o renombrala con `Ctrl+R`.
- `--continue` te abrió otra sesión: es lo esperado, abre la más reciente de la carpeta. Para una puntual, `--resume <nombre>`.
- `git commit` falla con "Please tell me who you are": configurá tu identidad una vez con `git config --global user.name "Diego"` y `git config --global user.email "diego@example.com"`.
- Si en el paso 4 Claude relee el archivo por su cuenta y dice 1000, repetí la pregunta aclarando "sin usar herramientas".
