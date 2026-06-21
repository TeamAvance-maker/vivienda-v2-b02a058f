## Cambios en el módulo Plano

### 1. Permisos de trabajo (memoria del proyecto)
- Marcar **Inicio** como bloqueado de nuevo y **Plano** como desbloqueado en `mem://index.md`, para que en lo sucesivo solo se toque Plano sin tu permiso.

### 2. Colores boutique en las etiquetas de estado
En la barra de KPIs del Plano (arriba del filtro), las tarjetas "Terminados", "En ejecución" y "Sin iniciar" usarán los mismos tonos que pusimos en el Inicio:

- Terminados → verde olivo `oklch(0.52 0.07 145)`
- En ejecución → amarillo miel `oklch(0.65 0.09 80)`
- Sin iniciar → rojo terracota `oklch(0.52 0.10 35)`

Se aplica al número grande (color del valor) y a un puntito de color a la izquierda del rótulo para que se lea de un vistazo. Las mismas tres tarjetas que aparecen al abrir el panel de Manzana también se alinean a estos tonos.

No tocamos:
- Los colores del plano cuando filtras por vale/etapa (verde claro / amarillo claro / gris) — esos son indicadores de avance de material, no de estado de sitio.
- Las insignias "Completo / Parcial / Sin entregar / N/A" dentro del panel de sitio (igual razón).

### 3. Verificación de métricas
Repaso rápido (sin cambios de fórmula salvo que detecte un error):
- **Total sitios**: cuenta de lotes dibujados con datos reales.
- **Avance global**: promedio de % de avance de los sitios con datos.
- **Terminados / En ejecución / Sin iniciar**: estado general por sitio (`siteProgress`).
- **Vales completos**: completos / aplicables sumados sobre todos los sitios.
- **Distribución por tipo**: conteo A1/A2/B/C.
- **Bloque del vale/etapa**: completos/parciales/sin entregar/N/A.

Si alguna no cuadra con lo que esperas, dímelo después de probar.

### 4. "Ver detalles" debajo de cada filtro (excepto Estado)
Debajo de los labels **Vale tipo / Etapa**, **Manzana**, **Tipo casa** y **Sitio** aparece un enlace pequeño "Ver detalles →". Al hacer click se abre un panel lateral (igual estilo que el de Sitio/Manzana) con la tabla estadística correspondiente:

- **Vale tipo / Etapa** → tabla con cada vale y, debajo, cada etapa, mostrando: total aplicable, completos, parciales, sin entregar, % avance.
- **Manzana** → tabla con cada manzana: total sitios, terminados, en ejecución, sin iniciar, % avance promedio.
- **Tipo casa** → tabla con cada tipo (A1/A2/B/C): total sitios, terminados, en ejecución, sin iniciar, % avance promedio.
- **Sitio** → tabla con cada sitio: manzana, tipo casa, % avance, estado, vales completos/aplicables. Con búsqueda por tokens y paginación (regla global de listbox: 10 por página).

Las cuatro tablas con búsqueda por tokens (cuando aplique) y orden por columnas — siguiendo la regla global que ya usamos en el Inicio.

### Detalles técnicos
- Archivo a editar: `src/sections/plano.tsx` (StatCards con `iconColor`/dot, nuevos paneles `VerDetallesPanel` por dimensión usando `useTableControls`/`TableToolbar`/`SortableTh`/`TablePagination` que ya existen en el dashboard — se extraerán a un módulo compartido `src/lib/listbox-controls.tsx` si aún no lo están).
- Cálculo de los resúmenes nuevos: reutiliza `siteProgress` + agrupación por manzana/tipo/vale-etapa en `useMemo`, sin tocar `sites-compute.ts` ni `plano-compute.ts`.
- Memoria: actualizar `mem://index.md` Core ("Plano desbloqueado, resto bloqueado").
