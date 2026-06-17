# Plan: ajustes al menú y al Plano

Lo hago en 4 pasos pequeños para evitar errores. Después de cada paso verifico que compile y que no haya errores en el preview antes de seguir.

---

## Paso 1 — Eliminar el menú "Sitios y Vales"

- En `src/components/app-shell.tsx`: quitar la entrada `{ key: "sitios", ... }` del array `TABS` y quitar `"sitios"` del tipo `TabKey`.
- En `src/routes/index.tsx`: cambiar el tab inicial de `"sitios"` a `"plano"` y eliminar la línea `{tab === "sitios" && <SitesSection />}` y su import.
- **No borro** `src/sections/sites.tsx` ni `sites-queries.ts` ni `sites-compute.ts` porque el módulo de Plano y Entregas los siguen usando.

Verifico que el preview cargue en "Plano" sin errores.

---

## Paso 2 — Pintado del plano sólo bajo selección + Etapas en el listbox

En `src/sections/plano.tsx`:

- **Coloreado neutro por defecto**: cuando NO hay vale tipo seleccionado, todos los sitios se pintan con el color de tipo de casa (TIPO_FILL) — ya no se aplica `STATUS_FILL`. Así el plano no muestra estados hasta que el usuario filtre.
- **Listbox combinado Vale + Etapa**: el selector "Vale tipo" pasa a ser un selector jerárquico con dos niveles:
  - Opción "Todos"
  - Por cada `ValeTypeV2`: una entrada `code · name` (vale completo, todas las etapas)
  - Debajo, sub-opciones por cada `ValeStage` de ese vale: `   └ E{n} · {stage.name}` (sangradas)
  - El estado de filtro pasa de `valeTypeId: string` a `valeFilter: { type: "all" } | { type: "vale"; valeTypeId } | { type: "stage"; valeTypeId, stageId }`.
- **Cálculo del color por celda** cuando hay filtro:
  - Si filtro = vale → usa `cellStatus(site, valeType, maps)` (ya existe).
  - Si filtro = etapa → nueva función `stageCellStatus(site, stage, maps)` en `plano-compute.ts` que mira sólo esa etapa (complete/partial/empty/na según reqs vs delivered).
- **Filtro "Estado"**: sólo tiene efecto cuando hay un vale/etapa seleccionado (que es cuando hay estados visibles). Si no, queda deshabilitado.
- **Verificar todos los botones**: revisar que "Limpiar" reinicia todos los filtros incluido el nuevo `valeFilter`; que los selectores de Manzana, Tipo casa, Sitio, Estado funcionen; que el click en sitio y en manzana abra el Sheet correcto.

---

## Paso 3 — Estadísticas generales del plano

Reemplazar el actual recuadro "Resumen" lateral por un **panel superior de estadísticas** (4–6 tarjetas compactas) que muestre:

- Total de sitios del plano
- Sitios por tipo (A1/A2/B/C) — chips
- **% Avance global** (promedio de `siteProgress.pct` sobre todos los sitios reales del plano)
- Sitios terminados / en ejecución / sin iniciar (recuento)
- Vales completos en total vs aplicables
- Si hay un vale o etapa seleccionado: agregar tarjetas adicionales con stats de **ese vale/etapa** (cuántos sitios complete/partial/empty).

Esto NO cambia el coloreado del plano, sólo agrega información arriba del SVG. La columna lateral se queda sólo para leyendas o se elimina para dar más ancho al plano.

---

## Paso 4 — Detalle de sitio mejorado

En el `SitePanel` de `src/sections/plano.tsx`:

- Mostrar arriba el **% de avance general** del sitio (ya existe) + estado.
- **Listar sólo los vales con entregas parciales o completas** (filtrar `v.status === "complete" || v.status === "partial"`). Ocultar los `empty` y `na`. Si no hay ninguno → mensaje "Aún sin entregas".
- Cada vale del listado es **clickeable**. Al hacer click se expande/abre un sub-panel que muestra, por cada etapa del vale aplicable al `house_type` del sitio:
  - Material (código + descripción + unidad)
  - Requerido
  - Entregado
  - Falta (= max(0, req − entregado)); si falta = 0 → badge "Completo"
- Para esto agrego en `plano-compute.ts` una función `valeBreakdown(site, valeType, maps)` que devuelva por etapa y por material `{material, req, delivered, missing}` usando los mismos mapas que ya tenemos.

---

## Archivos a modificar

- `src/components/app-shell.tsx` — quitar tab sitios
- `src/routes/index.tsx` — quitar render de SitesSection y cambiar tab inicial
- `src/lib/plano-compute.ts` — agregar `stageCellStatus` y `valeBreakdown`
- `src/sections/plano.tsx` — todos los cambios visuales/lógicos (pasos 2, 3 y 4)

**No tocar**: `sites-compute.ts`, `sites-queries.ts`, `sites-types.ts`, `deliveries.tsx`, `vale-tipo.tsx`, `plano-layout.ts`, ni la base de datos.

---

## Verificación al terminar cada paso

Reviso build, runtime errors y abro el preview en `/` → tab Plano para confirmar:
1. Carga sin errores
2. Filtros funcionan
3. Click en sitio y manzana abre el panel correcto
4. Botón "Limpiar" resetea todo

Si encuentras algo que prefieras distinto (ej. mantener un mini-resumen lateral, o que el detalle del vale se abra en otro Sheet en vez de expandirse), dímelo antes de implementar.