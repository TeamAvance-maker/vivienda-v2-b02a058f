# Análisis de un vale (nueva pantalla)

Una pantalla nueva donde eliges **un vale tipo** (por ejemplo "PUERTAS") y ves todo sobre él: sus etapas separadas, cuánto material ya se entregó, cuánto falta, y qué sitios están incompletos.

## Dónde vivirá

Nueva opción en el menú lateral llamada **"Análisis de vale"**, justo después de "Reportes".

## Qué se verá, de arriba hacia abajo

1. **Elegir el vale**
   - Un buscador para elegir el vale tipo (busca por código o nombre, escribiendo palabras sueltas).

2. **Resumen rápido (tarjetas)**
   - Sitios donde aplica este vale.
   - Sitios completos / incompletos.
   - Porcentaje de avance de la obra para ese vale.

3. **Por etapa**
   - Una sección por cada etapa del vale (Etapa 1, Etapa 2, …).
   - Dentro de cada etapa, una tabla de materiales con: código, descripción, unidad, **necesario**, **asignado (entregado)**, **falta**, y % de avance.

4. **Por tipo de vivienda (A1, A2, B, C) por separado**
   - Una tabla por tipo de casa con los mismos totales (necesario / asignado / falta) de ese vale.
   - Sólo aparecen los tipos de casa a los que el vale realmente aplica.

5. **Por manzana**
   - Tabla con: manzana, sitios que aplican, completos, incompletos, y el total de material que falta en esa manzana.

6. **General de la obra**
   - Tabla consolidada de todos los materiales del vale: necesario total, asignado total, falta total.

7. **Sitios incompletos**
   - Lista con manzana, sitio, tipo de casa, etapa pendiente y **qué material y cuánto le falta** a cada uno.
   - Con buscador y paginación de 10 filas.

8. **Exportar**
   - Botones para **Excel** (una hoja por bloque: etapas, tipos de vivienda, manzanas, general, sitios incompletos) y **PDF** para imprimir, con el mismo estilo café que ya usan los otros informes.

## Detalles técnicos

- Archivo nuevo `src/sections/vale-analysis.tsx`; se registra el tab `analisis-vale` en `src/components/app-shell.tsx` y en `src/routes/_authenticated/index.tsx`.
- Los cálculos se hacen en el navegador con los datos que ya se cargan: `useSites`, `useValeTypes`, `useValeStages`, `useValeReqs`, `useMaterialsV2`, `useSiteDeliveries`, `useSiteDeliveryItems` (de `src/lib/sites-queries.ts`).
- Se reutiliza `buildMaps` de `src/lib/sites-compute.ts`; se agregan funciones puras nuevas en un archivo `src/lib/vale-analysis.ts` para los cortes por etapa, tipo de casa, manzana y sitio (necesario = suma de `vale_reqs` por sitio aplicable; asignado = suma de `site_delivery_items`; falta = máximo entre 0 y necesario − asignado, calculado por sitio y luego sumado).
- Todo con `useMemo`, buscador por tokens y paginación de 10, siguiendo las reglas globales del proyecto.
- Exportaciones con `xlsx` y `jspdf`/`jspdf-autotable`, ya instalados.
- Sólo lectura: no se toca la base de datos ni se crean tablas.
