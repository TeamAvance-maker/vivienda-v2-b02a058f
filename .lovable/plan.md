# Plan: Indicador principal automático + panel "Ver Detalle"

## Problema detectado

La etiqueta grande **"Indicador principal — Viviendas que pueden completarse con el stock actual"** (en `src/sections/dashboard.tsx`, líneas 341‑370) hoy usa la función vieja `housesPossible(...)` que mira:

- `house_material_req` (requisitos v1, por tipo de vivienda completo)
- `vExecuted` (viviendas ejecutadas v1)
- `vStock` (stock actual)

Pero el resto del sitio ya funciona con **v2**: sitios reales, vales por etapa, entregas parciales (`site_deliveries` + `site_delivery_items`) y requisitos `vale_reqs` por etapa. Por eso el número y el mensaje "Stock suficiente para todas las viviendas pendientes" no coinciden con la realidad que ve el usuario en el plano.

## 1. Cálculo nuevo del indicador (automático, basado en v2)

En `dashboard.tsx`, reemplazar el uso de `housesPossible` por un `useMemo` que recorra los sitios reales:

1. Para cada **sitio** (`sitesQ.data`) que no esté "terminado":
   - Para cada **vale aplicable** al tipo de vivienda del sitio:
     - Por cada **etapa** del vale, calcular `faltante = max(0, req.qty − entregado)` por material.
2. Sumar el **faltante total por material** → `Map<material_id, faltante>` (= demanda pendiente real).
3. Recorrer los sitios pendientes en orden y, descontando del stock actual (`vStock` mapeado por código → id de material v2), contar cuántos **sitios pueden quedar 100 % completos** y cuál es el **primer material que se agota** (limitante).

Salida:
- `sitiosCompletables` (número grande)
- `sitiosPendientes` (total de sitios no terminados)
- `materialLimitante` (código + descripción)
- `faltantesPorMaterial[]` (material, faltante total, stock actual, déficit)
- `sitiosPorTipoPendientes[]` (tipo de vivienda, total pendientes)
- `valesIncompletos[]` (vale tipo, # sitios donde está incompleto, # materiales con déficit)

Todo recalculado automáticamente cuando cambien sitios / vales / etapas / requisitos / entregas / stock.

## 2. Texto del indicador

Reemplazar los dos mensajes:

- Si **hay** material limitante:
  > "Material limitante: {código} {desc}. Faltan {n} unidades para completar todos los sitios pendientes."
- Si **no hay** limitante:
  > "Stock suficiente para completar los {N} sitios pendientes."

Al lado del mensaje (mismo "pill" o justo después), agregar un botón‑link **"Ver Detalle →"** que abre el panel lateral.

## 3. Panel lateral "Ver Detalle"

Usar `Sheet` de shadcn (ya en el proyecto) abriendo desde la derecha (`side="right"`), ancho amplio (`sm:max-w-xl`), con secciones:

1. **Resumen general**
   - Sitios totales / terminados / en ejecución / sin iniciar
   - Vales aplicables totales / completos / parciales / sin tocar
   - Sitios completables ahora con el stock actual / sitios pendientes

2. **Materiales con déficit** (tabla, ordenada por mayor déficit)
   - Material (código + descripción) · Stock actual · Demanda pendiente · **Déficit** (negativo en rojo)
   - Solo los que tengan `demanda > stock`.

3. **Materiales suficientes pero ajustados** (≤ 20 % de holgura)
   - Mismo formato, para anticipar futuros faltantes.

4. **Sitios pendientes por tipo de vivienda**
   - Tipo · Total pendientes · % del total

5. **Vales con más sitios incompletos**
   - Vale tipo · # sitios incompletos · # materiales en déficit asociados

Todo en solo lectura, con `fmtNumber`, sin acciones.

## 4. Memoria

Agregar a `mem://rules/global-input-rules` (y reflejar en el índice si aplica):

> Toda métrica/KPI del Dashboard debe calcularse desde datos v2 reales (sitios + vales + entregas + stock), nunca desde tablas v1 obsoletas como `house_material_req` o `houses_executed`.

## Archivos a modificar

- `src/sections/dashboard.tsx` — nuevo cálculo, nuevo texto, botón "Ver Detalle", `Sheet` con el resumen.
- (posible) `src/lib/sites-compute.ts` — helper nuevo `pendingDemandByMaterial(sites, valeTypes, maps)` para mantener `dashboard.tsx` ordenado.
- `mem://rules/global-input-rules` — nueva regla.

## Sin cambios

- Cálculo de Terminadas / En Ejecución / Sin Iniciar (ya es v2).
- KPIs de vales (ya v2).
- Sección Alertas, Plano, Tabla maestra, etc.
