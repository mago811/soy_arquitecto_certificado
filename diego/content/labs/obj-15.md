---
objective: 15
title: "Lab (repaso): tests triviales vs. tests que prueban algo"
minutes: 30
needs: ["Claude Code en Windows", "PowerShell", "Python 3.10+ (lanzador py)", "Git for Windows"]
sources:
  - url: https://code.claude.com/docs/en/common-workflows
    title: "Common workflows (Work with tests)"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
  - url: https://code.claude.com/docs/en/tools-reference
    title: "Tools reference (activar el virtualenv antes de lanzar Claude Code)"
status: verificada
---

## Objetivo

Pedir tests dos veces para la misma función: una con "subí la cobertura" y otra con test modelo + fixtures en `CLAUDE.md` + comportamientos. Comparar la calidad de los asserts.

## Pasos

1. Preparar (5 min), en PowerShell:

```powershell
New-Item -ItemType Directory lab-obj15 | Out-Null
Set-Location lab-obj15
git init
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install pytest
New-Item -ItemType Directory -Force tests | Out-Null
New-Item -ItemType File tests\__init__.py | Out-Null
```

Si PowerShell bloquea `Activate.ps1`, corré `Set-ExecutionPolicy -Scope Process RemoteSigned` y repetí. Los archivos de Python (el `'@` de cierre va pegado al margen izquierdo):

```powershell
Set-Content -Encoding utf8 -Path mora.py -Value @'
from datetime import date
def calcular_mora(monto: float, vence: date, pago: date, tasa_diaria: float = 0.001) -> float:
    if monto < 0:
        raise ValueError("monto negativo")
    dias = (pago - vence).days
    return round(monto * tasa_diaria * dias, 2) if dias > 0 else 0.0
'@
Set-Content -Encoding utf8 -Path tests\conftest.py -Value @'
import pytest
from datetime import date
@pytest.fixture
def vencimiento():
    return date(2026, 11, 10)
'@
Set-Content -Encoding utf8 -Path tests\test_ejemplo.py -Value @'
from mora import calcular_mora
def test_pago_en_termino_no_tiene_mora(vencimiento):
    assert calcular_mora(1000, vencimiento, vencimiento) == 0.0, "pagar el día del vencimiento no genera mora"
'@
python -m pytest -q
Set-Content -Encoding ascii -Path .gitignore -Value '.venv/', '__pycache__/'
git add .
git commit -m base
```

`python -m pytest -q` tiene que decir `1 passed`. Arrancá `claude` **desde esta misma ventana**, con el venv activo: así la shell de Claude encuentra `pytest`.

2. Ronda A (8 min). En `claude`: `Agregá tests en tests/test_a.py para mora.py hasta tener 100% de cobertura.` Leé los asserts: ¿cuántos verifican un valor concreto? ¿Usó la fixture `vencimiento`?

3. Ronda B (12 min). Creá `CLAUDE.md` en la raíz con el editor (`code CLAUDE.md` o `notepad CLAUDE.md`) y pegá:

```markdown
## Tests
- Correr uno: pytest tests/<archivo>.py -q
- Fixture compartida: `vencimiento` en tests/conftest.py. Usala; no armes fechas base a mano.
- Un test vale si verifica un valor o una excepción concreta. No sirven asserts de "no es None" ni de tipo.
```

`/clear` y pedí:

```text
Agregá tests en tests/test_b.py siguiendo el estilo de @tests/test_ejemplo.py.
Comportamientos: 1 día tarde, 30 días tarde, pago anticipado (mora 0), monto 0, monto negativo -> ValueError.
Corré pytest tests/test_b.py -q y mostrame la salida.
```

4. Compará (5 min): asserts con valor concreto, uso de la fixture, mensajes de assert, casos borde.

## Cómo sabés que salió bien

- `test_b.py` usa `vencimiento`, tiene asserts con valores (`== 1.0`, `pytest.raises(ValueError)`) y mensajes como el ejemplo.
- Claude te mostró la salida de `pytest`.

## Si algo falla

- **No usa la fixture**: revisá que `CLAUDE.md` esté en la raíz de la carpeta donde arrancás `claude`; si lo creaste con la sesión abierta, salí y volvé a arrancar `claude`. `/memory` te muestra dónde está cada archivo de memoria.
- **pytest no importa `mora`**: corré desde la raíz de `lab-obj15` con `python -m pytest`, y revisá que exista `tests\__init__.py` (`Test-Path tests\__init__.py` tiene que dar `True`).
- **Claude dice que `pytest` no existe**: arrancaste `claude` en una ventana sin el venv activo. Salí, corré `.\.venv\Scripts\Activate.ps1` y volvé a abrir `claude` desde ahí (la doc pide activar el virtualenv antes de lanzar Claude Code).
