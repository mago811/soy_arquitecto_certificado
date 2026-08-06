# Lab día 6 💻 — Few-shot al extractor del día 5 (~40 min)

Objetivo: medir la accuracy del extractor del día 5, mejorarla con few-shot y demostrar que un few-shot sin nulls la rompe.

## Setup (2 min)

Reusá el `extractor.py` del día 5 con el SCHEMA arreglado (nullable + enum). Reemplazá `FACTURA` por:

```python
FACTURAS = [
    "FACTURA\nProveedor: Agroquimica Litoral SA\nCUIT: 30-70812345-6\nFecha: 2026-07-15\nDetalle: 200L herbicida\nTotal: 950000\nCategoria: insumos",
    "FACTURA\nProveedor: Transporte Ruta 9\nDetalle: flete a acopio\nTotal: 310500.75\nCategoria: logistica",
    "FACTURA\nProveedor: Electricidad Campo SRL\nFecha: 3 de agosto del 26\nDetalle: reparacion tablero\nTotal: 89000",
]
```

y envolvé el request y el print en un `for f in FACTURAS:`, usando `f` en el content.

## Parte 1 — Medir la base (10 min)

`python extractor.py`. Anotá por factura: ¿la 2 devuelve `fecha: null` o inventa? ¿La 3 sale `2026-08-03`, queda cruda o fabrica otra cosa? Corré dos veces y guardá los outputs: esa es tu línea de base.

## Parte 2 — El fix few-shot (18 min)

Agregá antes del request:

```python
EJEMPLOS = """Ejemplos:

Input:
FACTURA
Proveedor: Corralon Norte SA
Fecha: 12/07/26
Total: $ 45.300,50
Output:
{"proveedor": "Corralon Norte SA", "cuit": null, "fecha": "2026-07-12", "total": 45300.5, "categoria": "otros"}

Input:
FACTURA
Proveedor: Ferreteria Sur
CUIT: 30-71222333-4
Detalle: bulones
Total: 12000
Output:
{"proveedor": "Ferreteria Sur", "cuit": "30-71222333-4", "fecha": null, "total": 12000, "categoria": "ferreteria"}
"""
```

y cambiá el content a:

```python
f"{EJEMPLOS}\nExtrae los datos de esta factura:\n\n{f}"
```

Corré de nuevo y compará contra la base: la fecha rara debería salir ISO 8601 y los faltantes en null. El ejemplo demuestra la conversión y el uso de null; la description sola solo la pedía.

## Parte 3 — Romperlo a propósito (7 min)

Reemplazá los dos Output de `EJEMPLOS` por versiones con TODOS los campos completos (inventales cuit y fecha a mano). Corré: aunque el schema sigue nullable, la factura 2 vuelve a salir con datos fabricados — los ejemplos "siempre completos" desenseñan el null que el schema permite. Restaurá los ejemplos buenos.

## Cierre (3 min)

¿Quién enseñó más: la description o el ejemplo? Tachá t2 del día 6 en el dashboard.
