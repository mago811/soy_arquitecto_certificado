---
objective: 10
title: "Lab: el mismo research en serie, en paralelo y en cadena"
minutes: 30
needs: ["Claude Code", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/sub-agents
    title: "Create custom subagents"
  - url: https://www.anthropic.com/engineering/multi-agent-research-system
    title: "How we built our multi-agent research system"
  - url: https://www.anthropic.com/engineering/building-effective-agents
    title: "Building effective agents"
status: verificada
---

## Objetivo

Sentir la diferencia de **latencia** entre subagentes en serie y en paralelo, ver por qué un paso **dependiente** tiene que ir en secuencia, y provocar un problema de **cobertura** por mala descomposición.

## Pasos

### 1. Un repo con tres módulos independientes (4 min)

En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj10
Set-Location lab-obj10
New-Item -ItemType Directory -Force auth, database, api
foreach ($m in "auth", "database", "api") {
  foreach ($i in 1..4) {
    Set-Content -Path "$m\f$i.js" -Value "// $m archivo ${i}: función $m$i(); TODO: manejar errores" -Encoding utf8
  }
}
Get-ChildItem -Recurse -File
```

Tenés que ver 12 archivos (`f1.js` a `f4.js` en cada carpeta). Ojo con `${i}:` y no `$i:`: en PowerShell, `$i:` pegado a una palabra se lee como otra cosa y el comando falla.

### 2. En serie (6 min)

Abrí `claude` y pedí:

```text
Usá un subagente para investigar auth/. Cuando termine, otro para database/.
Cuando termine, otro para api/. Uno por vez. Después resumí los TODOs.
```

Mirá el panel de subagentes y anotá el tiempo total aproximado.

### 3. En paralelo (6 min)

`/clear` y pedí (es el prompt de ejemplo de la doc):

```text
Research the authentication, database, and API modules in parallel using separate subagents
```

Anotá el tiempo. Los tres aparecen a la vez en el panel: terminan en el tiempo del más lento, no en la suma.

### 4. En cadena: cuando hay dependencia (6 min)

`/clear` y pedí:

```text
Usá un subagente para listar todos los TODOs del repo con su archivo.
Después, con ESA lista, usá otro subagente para proponer un fix por TODO.
```

Preguntate: ¿se podía correr el segundo en paralelo con el primero? No: necesita la lista. Eso es un pipeline secuencial.

### 5. Romper la cobertura (6 min)

`/clear` y pedí:

```text
Hacé una auditoría de manejo de errores de TODO el repo.
Repartí el trabajo así: un subagente para auth/f1.js y otro para auth/f2.js.
```

Mirá el resultado: dice poco o nada de `database/` y `api/`. Los subagentes hicieron bien su parte; **la descomposición fue demasiado angosta**. Ahora pedí de nuevo dejando que Claude reparta el alcance por módulo sin solaparse y compará.

### 6. Cuándo NO usar subagentes (2 min)

Pedí: `¿Qué dice auth/f1.js?` Si lanza un subagente, es sobrecosto: para algo así alcanza una lectura directa.

## Cómo sabés que salió bien

- Paso 3 tarda claramente menos que el paso 2.
- Paso 4: el segundo subagente arranca después del primero y usa su lista.
- Paso 5: el primer reporte tiene huecos; el segundo cubre los tres módulos.
- Podés decir qué patrón elegirías para cobertura, para latencia y para dependencias.

## Si algo falla

- Si en el paso 2 Claude igual lanza los tres juntos, repetí remarcando "esperá a que termine cada uno".
- En una sesión interactiva los subagentes arrancan en background por defecto y, con fork mode prendido (el default), Claude no puede quedarse esperando a uno: el reporte llega en un turno posterior. Si en los pasos 2 o 4 no logra esperar, creá la carpeta con `New-Item -ItemType Directory -Force .claude`, abrí `code .claude\settings.json` y dejá el archivo así (si ya tenía otras claves, agregá solo el bloque `env`; no lo generes con `Set-Content`): `{ "env": { "CLAUDE_CODE_FORK_SUBAGENT": "0" } }`. Salí de `claude`, volvé a abrir `claude` y pedile "esperá el reporte" (doc: *Let Claude wait for a subagent*).
- Si no ves el panel de subagentes, mirá los mensajes de la tool `Agent` en el transcript.
- Los subagentes gastan tokens propios: con este repo chiquito es poco, pero en uno real tenelo en cuenta.
