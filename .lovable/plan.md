
# Plan de cierre: recepciones + limpieza de materiales

Vamos a hacer 4 cositas, en orden. Te explico cada una.

## 1. Conectar Recepciones al catálogo nuevo (materials_v2)

Hoy la tabla `receptions` apunta al catálogo **viejo** (`materials`). Hay que apuntarla al **nuevo** (`materials_v2`) para que el stock se calcule bien.

Pasos en la base de datos (migración SQL):
- Sacar la "amarra" (FK) vieja de `receptions.material_code → materials`.
- Poner la "amarra" nueva: `receptions.material_code → materials_v2.code`.
- Recrear las vistas `v_received` y `v_stock` para que sumen contra `materials_v2`.
- Lo mismo con `delivery_items`, `inventory_counts` e `inventory_adjustments` (también apuntan al catálogo viejo) para que todo quede consistente.

Si alguna fila vieja tiene un código que ya no existe en `materials_v2`, te la muestro antes de seguir.

## 2. Importar las 18 recepciones históricas

Tomamos la planilla `recepciones_mapeo.xlsx` (hoja **Recepciones**) y cargamos cada fila como recepción nueva con:
- `date` = hoy (14-jun-2026)
- `guia` = "CARGA INICIAL"
- `note` = "Importado de planilla histórica" (si la columna existe, si no, va dentro de guía)
- `material_code` = el código nuevo que marcaste (M0181, M0182, etc.)
- `handedness` = según la columna Sentido (DER/IZQ/—)
- `qty` = la cantidad de la planilla

Casos especiales según tu respuesta:
- **P4 COCINA C IZQ** (1 u.) → se carga como **M0180** (mismo código que la DER, ya que la descripción no distingue sentido).
- **P2 DORM C** (1 DER + 1 IZQ) → ambas se cargan como **M0186**, según lo que marcaste OK.

Total: **18 filas** insertadas en `receptions`.

## 3. Unificar los 4 materiales duplicados en los vales

Según la planilla `Materiales_Duplicados_Para_Revisar`, renombramos en `vale_reqs.material_description` (solo el nombre, la unidad la dejamos como está):

| De (mal escrito) | A (correcto) |
|---|---|
| gas butano | Gas butano |
| grapas 2" | GRAPAS 2" |
| PL 15X7,5X1,2 MM | PL 15x7,5x1,2 mm |
| VINILIT PVC TRADICIONAL | Vinilit PVC Tradicional |

## 4. Pasar TODAS las descripciones a MAYÚSCULAS

Después de unificar duplicados, hacemos un `UPDATE` masivo:
- `materials_v2.description` → MAYÚSCULAS
- `vale_reqs.material_description` → MAYÚSCULAS

Así "Gas butano" termina siendo "GAS BUTANO", "PL 15x7,5x1,2 mm" termina "PL 15X7,5X1,2 MM", etc. Quedan todos parejos.

## 5. Pantalla Recepciones — ajuste menor

El selector de material en `src/sections/receptions.tsx` ya lista todo el catálogo. Lo dejamos apuntando a `materials_v2` (mismo hook `useMaterials`, que ya leerá la tabla nueva tras la migración) y verificamos que:
- El buscador filtre también por descripción completa.
- Se muestre el sentido (DER/IZQ) en la lista.

No cambia el look, solo la fuente de datos.

## Orden de ejecución

```text
1) Migración SQL (estructura + vistas)   ← tú apruebas
2) Renombrar duplicados en vale_reqs
3) UPDATE descripciones → MAYÚSCULAS
4) INSERT de las 18 recepciones
5) Ajuste pantalla Recepciones (si hace falta)
6) Te muestro el resultado en el dashboard
```

## Lo que NO voy a tocar

- Catálogo viejo `materials` (lo dejamos quieto por si hay que mirarlo).
- Vales tipo (`vale_types_v2`, `vale_stages`) — solo renombramos los 4 materiales duplicados dentro de `vale_reqs`.
- Datos de entregas (`deliveries`) — solo cambiamos la "amarra" del código, los registros existentes quedan igual.

¿Le damos? Si apruebas, paso a build mode y arranco con la migración.
