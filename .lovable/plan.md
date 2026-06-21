## Problema

Hoy el % de cada etiqueta cuenta sólo **sitios 100% terminados ÷ sitios aplicables**. Si tienes 58 sitios A1 y 16 están "en ejecución" (con materiales entregados pero no todos los vales completos), salen **0,00%** — aunque sí hay trabajo hecho.

## Cambio

Voy a calcular el avance contando **líneas de material** (cada combinación etapa + material que un sitio necesita según su tipo de casa), no sitios completos ni cantidades.

- Una "línea" se considera **cumplida** cuando lo entregado en ese sitio ≥ lo requerido.
- **Avance del sitio** = líneas cumplidas ÷ líneas requeridas para ese sitio.
- **Avance de un grupo** (vale/etapa, manzana, tipo, sitio) = suma de líneas cumplidas del grupo ÷ suma de líneas requeridas del grupo.

Así, un A1 con 16 sitios en ejecución reflejará un % pequeño pero visible (ej: 3,47%) en cuanto haya cualquier material entregado.

## Dónde se aplica

Los 4 paneles "Ver detalles" usan el mismo método de conteo de líneas:

1. **Vale tipo / Etapa** — líneas cumplidas ÷ líneas aplicables, sumadas sobre todos los sitios (separado para fila de vale y filas de etapa).
2. **Manzana** — líneas cumplidas ÷ líneas aplicables de los sitios de esa manzana.
3. **Tipo casa** — líneas cumplidas ÷ líneas aplicables de los sitios de ese tipo.
4. **Sitio** — líneas cumplidas ÷ líneas aplicables del sitio (la columna "Vales" sigue mostrando vales 100% completos como referencia).

Se mantienen 2 decimales en todos los `%`.

## Detalle técnico

- Edito `src/sections/plano.tsx`:
  - Nueva función helper local `lineCounts(site, ...)` que devuelve `{ done, total }` usando `maps.reqsByStageHouse` + `maps.deliveredBySiteStageMat` (sin tocar `plano-compute.ts`).
  - Reemplazo los 4 cálculos de `pct` en los paneles para usar acumuladores `sumDone / sumTotal` en vez de `completos/aplicable` o `term/total`.
  - Las columnas "Terminados / En ejec. / Sin iniciar" y "Aplica / Completos / Parciales / Sin entr." **no cambian** — siguen contando sitios o vales como antes.
- No toco la lógica de las KPIs principales ni los colores de celda del plano.