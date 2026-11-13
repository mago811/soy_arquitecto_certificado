---
objective: 7
title: "Lab: plan fijo vs. plan que se adapta, en un bug con pista escondida"
minutes: 30
needs: ["Claude Code", "una carpeta de prueba"]
sources:
  - url: https://www.anthropic.com/engineering/building-effective-agents
    title: "Building effective agents"
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://code.claude.com/docs/en/sessions
    title: "Manage sessions"
status: verificada
---

## Objetivo

Correr la misma investigación con dos prompts: uno que **impone una secuencia fija** y otro que **pide adaptar el plan a lo que encuentra**. Comparar cuántos pasos inútiles hace cada uno.

## Pasos

### 1. Un "incidente" de juguete (5 min)

```bash
mkdir lab-obj07 && cd lab-obj07
mkdir logs config db
cat > logs/app.log <<'EOF'
2026-11-13T10:00:01 INFO  start
2026-11-13T10:00:02 ERROR TLS handshake failed: certificate expired (api.pagos.local)
2026-11-13T10:00:03 ERROR retry 1 failed: certificate expired
EOF
echo '{"timeout_ms": 3000, "api": "https://api.pagos.local"}' > config/app.json
echo 'SELECT 1; -- 48 tablas, nada raro' > db/schema.sql
for i in $(seq 1 15); do echo "-- migración $i sin cambios relevantes" > db/m$i.sql; done
```

### 2. Prompt fijo (8 min)

```bash
claude -n plan-fijo
```

```text
Investigá por qué falla el servicio. Seguí EXACTAMENTE este orden y no lo cambies:
1) revisá cada archivo de db/ uno por uno, 2) revisá config/, 3) revisá logs/.
Al final, dame la causa raíz.
```

Contá cuántos archivos lee antes de llegar a `logs/`. Salí con `/exit`.

### 3. Prompt adaptativo (8 min)

```bash
claude -n plan-adaptativo
```

```text
Investigá por qué falla el servicio.
Antes de leer nada, escribí en PLAN.md un plan corto con hipótesis.
Después de cada hallazgo, actualizá PLAN.md: descartá hipótesis, agregá
subtareas nuevas si aparecen y reordená. Pará cuando tengas evidencia
suficiente de la causa raíz.
```

Abrí `PLAN.md` al final y mirá cómo cambió.

### 4. Compará (5 min)

Completá esta tabla en un papel:

| | Plan fijo | Plan adaptativo |
|---|---|---|
| Archivos leídos | | |
| ¿Llegó a la causa (certificado vencido)? | | |
| ¿Cambió el plan en el camino? | | |

### 5. El caso contrario (4 min)

Pensá: "convertir 100 facturas: extraer → validar → formatear". ¿Querés que el agente invente subtareas? No: ahí va una **cadena fija con gates** (si la validación falla, no se formatea). Escribí en una línea por qué.

## Cómo sabés que salió bien

- El plan fijo lee las 16 de `db/` y la config antes de ver el log (o te avisa que el orden es ineficiente y lo sigue igual).
- El adaptativo lee pocos archivos, deja en `PLAN.md` la hipótesis del certificado y descarta "base de datos".
- Podés explicar en una frase cuándo usarías cada uno.

## Si algo falla

- Si el plan fijo se saltea el orden por su cuenta: anotalo. Claude a veces se adapta igual; lo que mirás es que tu prompt lo estaba empujando a no hacerlo.
- Si el adaptativo no crea `PLAN.md`, aceptá el permiso de escritura cuando lo pida o repetí la instrucción.
- Para volver a cualquiera de las dos corridas: `claude --resume plan-fijo` o `claude --resume plan-adaptativo`.
