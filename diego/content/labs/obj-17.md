---
objective: 17
title: "Lab: rastrear un flujo con Grep → Read → imports"
minutes: 45
needs: ["Claude Code", "git"]
sources:
  - url: https://code.claude.com/docs/en/tools-reference
    title: "Tools reference"
  - url: https://code.claude.com/docs/en/cli-reference
    title: "CLI reference"
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
status: no_verificado
---

## Objetivo

Hacer a mano (y después pedirle a Claude) una exploración incremental: encontrar un punto de entrada con Grep, leer solo lo necesario, seguir imports, rastrear una función re-exportada, y ver en vivo las trampas de `.gitignore`, del tope de 100 de Glob y de los archivos grandes.

## Pasos

### 0. Preparar el repo de juguete (8 min)

```bash
mkdir lab-obj17 && cd lab-obj17 && git init
mkdir -p src/api src/services/refund src/lib/notify build/generated
cat > src/lib/notify/send.ts <<'EOF'
export function sendEmail(to: string, body: string) { return { to, body }; }
EOF
cat > src/lib/notify/index.ts <<'EOF'
export { sendEmail as notifyUser, sendEmail as notifyAdmin } from "./send";
EOF
cat > src/services/refund/RefundService.ts <<'EOF'
import { notifyUser } from "../../lib/notify";
export function processRefund(orderId: string) { notifyUser("c@x.com", `refund ${orderId}`); return true; }
EOF
cat > src/services/refund/index.ts <<'EOF'
export { processRefund as issueRefund } from "./RefundService";
EOF
cat > src/api/refunds.ts <<'EOF'
import { issueRefund } from "../services/refund";
export function POST(orderId: string) { return issueRefund(orderId); }
EOF
cat > src/api/admin.ts <<'EOF'
import { notifyAdmin } from "../lib/notify";
export function alertAdmin() { notifyAdmin("admin@x.com", "alerta"); }
EOF
echo 'export const LEGACY_PRICE_V2 = 99;' > build/generated/prices.js
echo 'build/' > .gitignore
for i in $(seq 1 150); do echo "export const v$i = $i;" > src/lib/gen_$i.ts; done
seq 1 30000 | sed 's/^/\/\/ linea de relleno /' > src/legacy.js
echo 'export function reconcileLedger() { return "ok"; }' >> src/legacy.js
```

### 1. Habilitar Grep y Glob como tools (2 min)

En macOS, Linux y WSL, Grep y Glob no están en el set por defecto (Claude usa `grep`/`find` por Bash). Para ver las tools en acción, arrancá así:

```bash
claude --allowedTools "Grep" "Glob"
```

La doc dice que nombrar cualquiera de las dos en `--allowedTools` devuelve ambas. En Windows ya vienen.

### 2. Punto de entrada y seguir imports (10 min)

```text
Usando solo Grep, Glob y Read (sin Bash), explicame qué pasa cuando se llama al endpoint POST de reembolsos.
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
3) Leé src/legacy.js entero. Después encontrá reconcileLedger con Grep en modo content y leé solo esas líneas con offset y limit.
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

- Claude usa Bash igual: repetí "sin Bash" o arrancá con `claude --tools "Read,Grep,Glob"` (con `--tools` tenés solo las que listás).
- `src/legacy.js` no supera el límite: agrandalo cambiando `30000` por `200000`.
