## Objetivo

Desbloquear todo el sitio y hacer dos cambios globales:

1. Aplicar las reglas globales (búsqueda por tokens, ocultar flechitas en inputs numéricos, paginación por defecto 10, métricas auto-actualizadas, "Ver más →" en esquina inferior derecha de KPIs con onClick) en TODO el sitio.
2. Quitar el botón flotante de ayuda (el círculo en la esquina inferior derecha), dejando solo la entrada "Ayuda" del menú lateral.

## Paso 1 — Desbloqueo

- Actualizar `mem://index.md` para marcar el sitio como totalmente desbloqueado y permitir trabajar en todos los módulos.

## Paso 2 — Quitar el botón flotante de ayuda

- En `src/components/app-shell.tsx`: eliminar el `<HelpFab />` y su import. El menú lateral "Ayuda" sigue funcionando igual que ahora.
- Dejar el archivo `src/components/help-fab.tsx` en el proyecto por si se quiere recuperar luego (no se borra, solo no se usa).

## Paso 3 — Auditoría de reglas globales

Revisar cada sección y aplicar lo que falte. Recorrido:

- `src/sections/dashboard.tsx` (Inicio)
- `src/sections/plano.tsx` (Plano)
- `src/sections/materials.tsx`
- `src/sections/receptions.tsx`
- `src/sections/deliveries.tsx`
- `src/sections/casas.tsx`
- `src/sections/house-types.tsx`
- `src/sections/sites.tsx`
- `src/sections/inventory.tsx`
- `src/sections/reports.tsx`
- `src/sections/config.tsx`
- `src/sections/vale-tipo.tsx`
- Componentes compartidos: `src/components/data-table.tsx`, `src/components/searchable-select.tsx`.

Para cada uno verificar y corregir:

- **Búsqueda por tokens**: cualquier input de búsqueda (filtros de tabla, buscador de materiales, etc.) debe filtrar verificando que la fila contenga TODOS los términos separados por espacio (no coincidencia exacta ni "empieza por"). Centralizar como helper si conviene.
- **Inputs numéricos sin flechitas**: ocultar los spinners nativos (CSS `appearance: none` + `::-webkit-inner-spin-button`) en todos los `<Input type="number">`. Aplicarlo a nivel global en `src/styles.css` para que cubra todo el sitio de una vez.
- **Paginación por defecto 10**: en `data-table.tsx` y donde se use, dejar tamaño de página inicial = 10.
- **KPIs con onClick**: cualquier tarjeta/etiqueta de métrica clickeable debe mostrar el texto **"Ver más →"** en la esquina **inferior derecha** de la tarjeta.
- **Métricas automáticas**: confirmar que todos los contadores/porcentajes se recalculan cuando cambian los datos (sin necesidad de recargar). Revisar `useMemo`/`useQuery` y que no haya valores cacheados que se queden viejos.

## Paso 4 — Verificación

- Recorrer visualmente con Playwright las secciones principales (Inicio, Plano, Materiales, Recepciones, Entregas, Inventario, Reportes, Configuración) tomando capturas para confirmar:
  - No aparece el círculo flotante de ayuda.
  - Los inputs numéricos no muestran flechitas.
  - Las búsquedas filtran por tokens.
  - Las tarjetas KPI clickeables muestran "Ver más →" abajo a la derecha.

## Notas técnicas

- El CSS global de los spinners se añade una sola vez en `src/styles.css`:

```text
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type="number"] { -moz-appearance: textfield; }
```

- El helper de búsqueda por tokens vive en `src/lib/utils.ts` y se reutiliza desde cada sección/tabla:

```text
matchesTokens(haystack, query) →
  haystack.toLowerCase() contiene cada token de query.toLowerCase().split(/\s+/)
```

- No se tocan migraciones ni esquema. Solo frontend/presentación en absolutamente todo el sitio, que no quede nada del frontend sin revisar.