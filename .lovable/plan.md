## Desbloqueo: Menú Casas → Pestaña "Vales tipo"

Vamos a agregar un buscador de material dentro del tab **Vales tipo** (en Casas). El resto del menú Casas sigue bloqueado: no se tocará Tipos ni Manzanas/Sitios, y en Vales tipo solo se **suma** una sección nueva (no se cambia lo existente).

### ¿Qué verás en pantalla?

Dentro de Casas → pestaña "Vales tipo", aparecerá una caja nueva arriba del flujo actual con el título **"Buscar material en vales"**:

1. Un cuadro tipo lista desplegable con buscador (igual al que ya usas para elegir material) — escribes y filtra por código o descripción.
2. Apenas eliges un material, debajo aparece un listado con todas las apariciones de ese material:
   - Columnas: Tipo casa · Vale (código + nombre) · Etapa · Cantidad · Unidad · Acciones (Editar, Eliminar).
   - Buscador de texto, ordenamiento por columna, paginación (10/25/50/100 por página) y barra de desplazamiento vertical — usando el mismo `useTableControls` que ya tienes en Materiales.
3. Al hacer **clic en una fila** (o en un botón "Ir al vale"), la vista de Vales tipo se **posiciona automáticamente** en ese Tipo casa + Vale + Etapa exactos. Allí ya tienes el CRUD completo (agregar, editar cantidad con contraseña, eliminar con cascada) que ya existe — no se duplica.
4. Los botones de Editar/Eliminar **directos** desde la tabla de resultados también funcionan con el mismo diálogo de contraseña que usas hoy, sin salir del buscador.

### Detalles técnicos (para mí)

- Archivo nuevo: `src/sections/vale-material-search.tsx` con el componente `<ValeMaterialSearch />`.
- Se inserta dentro de `ValeTipoSection` (arriba de los selectores actuales) o como sub-bloque del tab "Vales tipo" en `casas.tsx`. Voto por **dentro de `vale-tipo.tsx`** para reutilizar `useValeReqs`, `useValeStages`, `useValeTypes`, `useMaterialsV2` y `materialsById`.
- Para que "Ir al vale" funcione, convertimos `houseType` / `valeTypeId` / `stageId` de `useState` locales a estado elevado (props o un pequeño contexto en el archivo). El click llama `setHouseType`, `setValeTypeId`, `setStageId` y hace scroll suave a la sección de materiales.
- Resultados se calculan con `useMemo` cruzando `vale_reqs` × `vale_stages` × `vale_types_v2` filtrados por `material_id`. No se toca la base de datos ni las RLS.
- Editar/Eliminar reutilizan `adminMutateFn` + `requestCascadeDelete` que ya existen.
- Tabla con `useTableControls` + `TableToolbar` + `SortableTh` + `TablePagination` (mismo patrón que `materials.tsx`).

### Lo que NO se toca

- Base de datos, RLS, migraciones — nada.
- Pestañas "Tipos" y "Manzanas/Sitios" del menú Casas — siguen bloqueadas.
- El CRUD existente de Vales tipo — intacto, solo se reutiliza.
- Diseño global, tema, navbar, candado de los demás menús — intacto.

¿Le doy "Implementar"?
