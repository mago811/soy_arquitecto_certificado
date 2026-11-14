---
objective: 12
title: "Lab: el parser de montos, en vueltas que sí mejoran"
minutes: 45
needs: ["Claude Code en Windows (PowerShell)", "Python 3.10+ para Windows (launcher py) con pytest", "Git for Windows", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
  - url: https://code.claude.com/docs/en/common-workflows
    title: "Common workflows (Work with tests, Reference files)"
  - url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
    title: "Increase output consistency"
status: verificada
---

## Objetivo

Hacer el mismo trabajo dos veces: primero con feedback vago y de a un problema, después con ejemplos entrada→salida, feedback puntual, los problemas en lote y un check pass/fail. Contar vueltas y comparar.

## Pasos

### 0. Preparar (5 min)

En PowerShell:

```powershell
New-Item -ItemType Directory -Force lab-obj12
Set-Location lab-obj12
git init
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install pytest
New-Item -ItemType Directory -Force tests\fixtures
code tests\fixtures\montos.csv
```

Si `Activate.ps1` da error de "ejecución de scripts deshabilitada", corré una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y repetí la activación. (Si no usás VS Code, cambiá `code` por `notepad`.)

Pegá en `tests\fixtures\montos.csv` y guardá:

```text
entrada,esperado
"1.234,50",1234.5
"(500,00)",-500.0
"USD 10",10.0
"$ 1.000",1000.0
"",
"-3,5",-3.5
```

Commiteá solo `tests` (el venv no va al repo):

```powershell
git add tests
git commit -m "fixtures"
```

### 1. Ronda A: vaga y de a uno (12 min)

Arrancá `claude` **en la misma ventana donde activaste el venv** (así Claude encuentra `python` y `pytest` del venv) y pedí:

```text
Hacé una función parsear_monto(texto) en montos.py para montos de extractos bancarios.
```

Probá vos a mano con un caso de la tabla. Cuando falle, respondé SOLO: `No anda bien con algunos montos, mejoralo.`
Repetí hasta 3 vueltas. Anotá cuántas vueltas y cuántos casos de la tabla quedan bien (probalos vos).

Después hacé `/clear` y, en otra ventana de PowerShell parada en `lab-obj12` (o saliendo de Claude), volvé a la base:

```powershell
git checkout -- .
git clean -fd -e tests -e .venv
```

`git clean` borra lo que Claude creó (por ejemplo `montos.py`) pero no toca `tests` ni `.venv`.

### 2. Ronda B: ejemplos + check + lote (15 min)

Ahora pedí, en un solo mensaje:

```text
Hacé parsear_monto(texto) en montos.py. Formato argentino: punto de miles, coma decimal,
negativos entre paréntesis o con "-", puede venir con "$" o "USD ". Vacío -> None.
Los casos reales están en @tests/fixtures/montos.csv (entrada -> esperado).
Escribí tests/test_montos.py que lea ese CSV y compare cada fila.
Corré `pytest tests/test_montos.py -q` e iterá hasta que pase. Mostrame el comando y la salida.
```

Para el `@`, escribí `@tests` y elegí `montos.csv` del autocompletado. Fijate qué tiene: ejemplos concretos (el CSV, pasado con `@`), un check pass/fail (pytest) y pedido de evidencia.

### 3. Feedback puntual en lote (8 min)

Agregá al CSV estos casos, que probablemente rompan algo:

```text
"1.234.567,89",1234567.89
"ARS 2,5",2.5
"( 10 )",-10.0
```

Corré vos, en PowerShell con el venv activo, `pytest tests\test_montos.py -q`. Copiá los fallos y mandalos **todos juntos**:

```text
Fallan estos 3 casos de montos.csv: <pegás la salida de pytest>.
Miralos juntos: miles con más de un punto, prefijo "ARS " y espacios dentro de los paréntesis.
Arreglalos en un solo cambio, sin romper los casos que ya pasaban, y volvé a correr pytest. Mostrame la salida.
```

### 4. Comparar (5 min)

| | Ronda A | Ronda B |
|---|---|---|
| Vueltas hasta terminar | | |
| Casos bien al final | | |
| ¿Viste evidencia (salida de pytest)? | | |

## Cómo sabés que salió bien

- En la ronda B, `pytest` pasa y Claude te muestra el comando y la salida.
- La ronda B termina en menos vueltas que la A, con más casos bien.
- En el paso 3, un solo mensaje con los 3 fallos alcanza (o casi).

## Si algo falla

- **Claude no lee el CSV**: verificá que escribiste `@tests/fixtures/montos.csv` (con `@`) y que el archivo existe.
- **pytest no encuentra el test**: corré desde la raíz de `lab-obj12` con el venv activado (el prompt empieza con `(.venv)`).
- **`pytest` no se reconoce como comando**: no activaste el venv en esa ventana. Corré `.\.venv\Scripts\Activate.ps1`, o usá `python -m pytest tests\test_montos.py -q`.
- **Arregla uno y rompe otro dos veces seguidas**: es la señal de la doc. `/clear` y un prompt nuevo que junte todo lo que aprendiste (los casos y la causa común).
- **"Todos los tests pasan" sin salida**: pedile explícitamente el comando y su salida antes de creerle.
