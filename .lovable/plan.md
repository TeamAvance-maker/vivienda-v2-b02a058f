# Ajuste de inventario con confirmación e historial

## Cómo va a funcionar (en cristiano)

1. Cuentas físicamente y registras un **conteo** (como hoy).
2. Si hay diferencia, junto al renglón aparece un botón **"Aplicar ajuste"**.
3. Al presionarlo te pide la **contraseña de obra**.
4. Confirmado, se crea un **ajuste** que iguala el stock teórico al contado.
5. Ese ajuste **queda marcado como aplicado y ya no se puede modificar ni borrar**. Si más tarde te das cuenta de un error, haces un **nuevo conteo** y aplicas otro ajuste.

## Cambios en la base de datos

Nueva tabla `inventory_adjustments` (es el "historial inmutable"):

- `id`, `count_id` (referencia al conteo que lo originó), `date`, `material_code`, `handedness`, `delta` (positivo o negativo), `prev_system_qty`, `counted_qty`, `note`, `applied_at`, `applied_by_label`.
- Sin políticas de UPDATE ni DELETE → ni desde la app ni con contraseña se puede tocar.

Cambios en `inventory_counts`:

- Nueva columna `adjustment_applied` (boolean, default false).
- Cuando se crea un ajuste, esta columna pasa a `true` y el conteo deja de ser editable/borrable.

Cambios en la vista `v_stock`:

- Pasa a sumar también los `delta` de `inventory_adjustments`, así el stock teórico refleja los ajustes.
- Fórmula nueva: `recibido − entregado + ajustes`.

## Cambios en la pantalla de Inventario

- En la tabla de conteos:
  - Si `diferencia ≠ 0` y aún no se ha aplicado → botón **"Aplicar ajuste"** (con candado de contraseña).
  - Si ya se aplicó → chip **"Ajustado"** y los botones de editar/eliminar se ocultan.
- Nueva sección debajo: **"Historial de ajustes"** (solo lectura), mostrando fecha, material, sentido, stock antes, contado, delta y nota. Sin acciones de editar/eliminar.

## Cambios en código (frontend)

- `src/lib/types.ts` y `src/lib/queries.ts`: tipo y hook `useAdjustments`.
- `src/lib/admin.functions.ts` / `admin.server.ts`: permitir `insert` en `inventory_adjustments` pero **bloquear** `update`/`delete` sobre esa tabla. Bloquear edición/borrado de conteos con `adjustment_applied = true`.
- `src/sections/inventory.tsx`:
  - Botón "Aplicar ajuste" por fila con diferencia.
  - Ocultar editar/borrar cuando `adjustment_applied`.
  - Tabla de historial de ajustes.

## Notas

- El ajuste **no toca recepciones ni entregas** (esos historiales siguen intactos). Solo agrega un movimiento de corrección de inventario.
- Si en el futuro quieres "deshacer" un ajuste, la única forma será otro conteo + otro ajuste. Eso es lo que pediste.
