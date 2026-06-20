## Reemplazar un material por otro en los vales

### Qué se agrega (dentro del panel "Buscar material en vales" del menú Casas → Vales tipo)

Un botón nuevo **"Reemplazar este material por otro"** que aparece justo al lado del buscador, **solo cuando ya seleccionaste un material** y la tabla muestra resultados. Así queda claro: primero buscas, ves dónde está usado, y recién entonces puedes decidir reemplazarlo.

### Cómo se ve y cómo se usa (paso a paso, sin tecnicismos)

1. Eliges un material en el buscador (ej: "Tornillo 3 pulgadas").
2. La tabla te muestra todos los vales que lo usan.
3. Aparece el botón **"Reemplazar por otro material…"** arriba de la tabla.
4. Al hacer clic se abre una ventana con:
  - **Material actual** (solo lectura): el que ya elegiste.
  - **Reemplazar por**: un segundo buscador para elegir el material nuevo.
  - **Aplicar en**: dos opciones con botones de radio:
    - ⚪ **Solo en las filas que yo marque** (checkbox por fila en la tabla)
    - ⚪ **En todos los vales que aparecen ahora mismo en la búsqueda** (todos los resultados visibles, no solo la página actual)
  - **Texto de ayuda visible** explicando cuándo usar cada opción (ver abajo).
  - **Contraseña de obra** (igual que en el resto del sitio).
  - Botones: **Cancelar** / **Reemplazar**.
5. Antes de ejecutar, muestra un **resumen de confirmación**: "Vas a reemplazar X por Y en N registros de M vales. ¿Confirmar?"
6. Al confirmar, se actualizan los registros y la tabla se refresca sola mostrando ahora el material nuevo (o vacía si ya no queda nada del viejo).

### Texto de ayuda dentro del diálogo (para que no sea confuso)

> **¿Cuándo usar esto?**
>
> - Cuando un material fue mal cargado en los vales y el correcto es otro (ej: se puso "Tornillo 2½" y debía ser "Tornillo 3").
> - Cuando un material se renombró o se unificó con otro y quieres dejar todos los vales apuntando al nuevo.
>
> **¿Cuándo NO usar esto?**
>
> - Si solo necesitas corregir la **cantidad** de un material → usa el botón "Editar" de la fila.
> - Si quieres **quitar** el material de un vale → usa "Eliminar".
> - Si el material nuevo lleva **otra unidad** (ej: pasar de "unidad" a "metros"), revisa primero las cantidades; el reemplazo **no convierte unidades** automáticamente.

### Reglas de seguridad

- Requiere **contraseña de obra** (mismo flujo que editar/eliminar).
- Si en algún vale ya existe una fila con el material nuevo y la misma etapa, **no se duplica**: se avisa y se omiten esas filas listándolas en el resumen (para que el usuario decida sumar cantidades manualmente o no).
- Si el material actual y el nuevo son iguales, el botón Reemplazar queda deshabilitado.
- Solo afecta a la pestaña "Vales tipo". El resto del sitio sigue bloqueado.  


### Detalles técnicos (interno)

- Nuevo componente `ReplaceMaterialDialog` dentro de `src/sections/vale-tipo.tsx`.
- Reutiliza `adminMutateFn` con `table: "vale_reqs"`, `action: "update"`, una llamada por `id` de fila (o un nuevo server fn `replaceMaterialInValeReqsFn` con una sola contraseña — recomendado para no pedirla muchas veces).
- Detección de duplicados: query previa a `vale_reqs` filtrando por `vale_stage_id` y `material_id = nuevo`.
- Sin cambios de base de datos, RLS, ni diseño global.

### Permiso que necesito  
  
*****ANTES DE APROBAR TU PLAN: una vez reemplazado el material "antiguo" se debe preguntar si desea eliminar el material "antiguo" de la tabla materiales, opción SI: muestra todo lo que está implicado ese material "antiguo" en las recepciones o en otra tabla y que los movimientos de ese material "antiguo" se traspasarán al material "nuevo", vendría una confirmacion y se eliminaría el material "antiguo" de la tabla materiales y los movimientos (recepciones, etc) se agregarían a los movmientos del material "nuevo". SI NECESITAS PREGUNTAR, HAZMELAS*****

Esto toca **solo la pestaña "Vales tipo"** que ya está desbloqueada. ¿Lo implemento?