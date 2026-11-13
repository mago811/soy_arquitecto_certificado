---
objective: 15
title: "Lab (repaso): tests triviales vs. tests que prueban algo"
minutes: 30
needs: ["Claude Code", "Python 3.10+ con pytest", "una carpeta de prueba"]
sources:
  - url: https://code.claude.com/docs/en/common-workflows
    title: "Common workflows (Work with tests)"
  - url: https://code.claude.com/docs/en/memory
    title: "How Claude remembers your project"
  - url: https://code.claude.com/docs/en/best-practices
    title: "Best practices for Claude Code"
status: no_verificado
---

## Objetivo

Pedir tests dos veces para la misma función: una con "subí la cobertura" y otra con test modelo + fixtures en `CLAUDE.md` + comportamientos. Comparar la calidad de los asserts.

## Pasos

1. Preparar (5 min):

```bash
mkdir lab-obj15 && cd lab-obj15 && git init
python -m venv .venv && source .venv/bin/activate && pip install pytest
mkdir tests
cat > mora.py <<'PY'
from datetime import date
def calcular_mora(monto: float, vence: date, pago: date, tasa_diaria: float = 0.001) -> float:
    if monto < 0:
        raise ValueError("monto negativo")
    dias = (pago - vence).days
    return round(monto * tasa_diaria * dias, 2) if dias > 0 else 0.0
PY
cat > tests/conftest.py <<'PY'
import pytest
from datetime import date
@pytest.fixture
def vencimiento():
    return date(2026, 11, 10)
PY
cat > tests/test_ejemplo.py <<'PY'
from mora import calcular_mora
def test_pago_en_termino_no_tiene_mora(vencimiento):
    assert calcular_mora(1000, vencimiento, vencimiento) == 0.0, "pagar el día del vencimiento no genera mora"
PY
git add . && git commit -m base
```

2. Ronda A (8 min). En `claude`: `Agregá tests en tests/test_a.py para mora.py hasta tener 100% de cobertura.` Leé los asserts: ¿cuántos verifican un valor concreto? ¿Usó la fixture `vencimiento`?

3. Ronda B (12 min). Creá `CLAUDE.md`:

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

- **No usa la fixture**: revisá que `CLAUDE.md` esté en la raíz y corré `/memory` para ver que se cargó.
- **pytest no importa `mora`**: corré desde la raíz de `lab-obj15`; si hace falta, creá un `tests/__init__.py` vacío o corré `python -m pytest`.
