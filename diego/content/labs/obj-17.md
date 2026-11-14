---
objective: 17
title: "Lab: rastrear un flujo con Grep → Read → imports"
minutes: 45
needs: ["Claude Code en Windows", "PowerShell", "Git for Windows"]
sources:
  - url: https://code.claude.com/docs/en/tools-reference
    title: "Tools reference"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
status: verificada
---

## Objetivo

Hacer a mano (y después pedirle a Claude) una exploración incremental: encontrar un punto de entrada con Grep, leer solo lo necesario, seguir imports, rastrear una función re-exportada, y ver en vivo las trampas de `.gitignore`, del tope de 100 de Glob y de los archivos grandes.

## Pasos

### 0. Preparar el repo de juguete (8 min)

En PowerShell, parado en tu carpeta de trabajo (por ejemplo `$HOME`). Pegá los bloques de a uno:

```powershell
New-Item -ItemType Directory lab-obj17 | Out-Null
Set-Location lab-obj17
git init
New-Item -ItemType Directory -Force src\api, src\services\refund, src\lib\notify, build\generated | Out-Null
```

Los archivos de código (con `Set-Content -Encoding utf8`; no uses `>` porque en PowerShell 5.1 escribe UTF-16):

```powershell
Set-Content -Encoding utf8 -Path src\lib\notify\send.ts -Value @'
export function sendEmail(to: string, body: string) { return { to, body }; }
'@
Set-Content -Encoding utf8 -Path src\lib\notify\index.ts -Value @'
export { sendEmail as notifyUser, sendEmail as notifyAdmin } from "./send";
'@
Set-Content -Encoding utf8 -Path src\services\refund\RefundService.ts -Value @'
import { notifyUser } from "../../lib/notify";
export function processRefund(orderId: string) { notifyUser("c@x.com", `refund ${orderId}`); return true; }
'@
Set-Content -Encoding utf8 -Path src\services\refund\index.ts -Value @'
export { processRefund as issueRefund } from "./RefundService";
'@
Set-Content -Encoding utf8 -Path src\api\refunds.ts -Value @'
import { issueRefund } from "../services/refund";
export function POST(orderId: string) { return issueRefund(orderId); }
'@
Set-Content -Encoding utf8 -Path src\api\admin.ts -Value @'
import { notifyAdmin } from "../lib/notify";
export function alertAdmin() { notifyAdmin("admin@x.com", "alerta"); }
'@
```

Ojo: el `'@` de cierre tiene que quedar pegado al margen izquierdo, sin espacios antes.

Las trampas (archivo gitignored, 150 archivos para el tope de Glob y un archivo enorme):

```powershell
Set-Content -Encoding utf8 -Path build\generated\prices.js -Value 'export const LEGACY_PRICE_V2 = 99;'
Set-Content -Encoding ascii -Path .gitignore -Value 'build/'
1..150 | ForEach-Object { Set-Content -Encoding utf8 -Path "src\lib\gen_$_.ts" -Value "export const v$_ = $_;" }
$relleno = 1..30000 | ForEach-Object { "// linea de relleno $_" }
($relleno + 'export function reconcileLedger() { return "ok"; }') | Set-Content -Encoding utf8 -Path src\legacy.js
```

Chequeo rápido: `(Get-ChildItem src\lib\gen_*.ts).Count` tiene que dar `150` y `(Get-Item src\legacy.js).Length` tiene que pasar de 262144 bytes (256 KB).

### 1. Arrancar con solo las tools de exploración (2 min)

En Windows, Glob y Grep ya vienen en el set de tools por defecto: no hay que habilitarlas. Pero Claude también tiene Bash (Git Bash) y PowerShell, y podría buscar con comandos de shell. Para que en este lab use solo las tools de exploración, **restringí** el set al arrancar:

```powershell
claude --tools "Read,Grep,Glob"
```

`--tools` limita qué tools existen en la sesión (con una lista, tenés solo las que nombrás). No lo confundas con `--allowedTools`, que solo las aprueba sin preguntar.

### 2. Punto de entrada y seguir imports (10 min)

```text
Usando solo Grep, Glob y Read (sin comandos de shell), explicame qué pasa cuando se llama al endpoint POST de reembolsos.
No leas archivos que no necesites. Al final, listame cada llamada a herramienta que hiciste.
```

Mirá la secuencia: debería ser Grep o Read de `src/api/refunds.ts` → seguir `issueRefund` → descubrir que es `processRefund` re-exportado → `RefundService.ts`.

### 3. El wrapper que renombra (8 min)

```text
Con Grep, buscá todos los usos de sendEmail en src/. ¿Cuántos encontrás?
```

Va a encontrar pocos. Ahora:

```text
Leé src/lib/notify/index.ts, sacá todos los nombres que exporta, y buscá con Grep los usos de cada uno.
```

Compará: ahora aparecen `RefundService.ts` y `admin.ts`.

### 4. Las trampas (12 min)

```text
1) Con Grep buscá LEGACY_PRICE_V2 en todo el repo. Después buscalo pasándole la ruta build/generated/ directo.
2) Hacé un Glob con el patrón **/* y decime si el resultado vino truncado. Después probá con src/services/**/*.ts.
3) Leé src/legacy.js entero con Read, sin offset, limit ni allow_large. Después encontrá reconcileLedger con Grep en modo content y leé solo esas líneas con offset y limit.
4) Usá Grep con output_mode count para el patrón "export" acotado con glob "src/lib/**/*.ts".
```

## Cómo sabés que salió bien

- Paso 2: Claude no leyó los 150 `gen_*.ts`.
- Paso 3: con los nombres exportados aparecen los dos llamadores escondidos.
- Paso 4.1: el primer Grep da 0 (build/ está en `.gitignore`); con la ruta directa lo encuentra.
- Paso 4.2: `**/*` viene truncado en 100; el patrón específico no.
- Paso 4.3: la lectura entera vuelve con `PARTIAL view` o un error que sugiere `offset`/`limit`; con Grep + `offset` llega a la función.
- Paso 4.4: ves cantidad por archivo y un total.

## Si algo falla

- Claude intenta correr comandos de shell: arrancaste sin `--tools`. Salí (`/exit`) y volvé a entrar con `claude --tools "Read,Grep,Glob"`.
- `src/legacy.js` no supera el límite: en el paso 0 cambiá `30000` por `200000` y volvé a correr esas dos líneas.
- En el paso 4.1 el primer Grep también encuentra `LEGACY_PRICE_V2`: fijate que `.gitignore` diga `build/` con `Get-Content .gitignore` y que lo hayas creado con `-Encoding ascii` (sin BOM).
- En el paso 4.3 Claude leyó el archivo entero de una: desde Claude Code v2.1.296, Read acepta `allow_large: true` cuando le pedís el archivo completo. Repetí la consigna aclarando "sin allow_large".
- PowerShell marca error en un bloque con `@'`: el `'@` de cierre quedó con espacios adelante. Borralos y pegá el bloque de nuevo.
