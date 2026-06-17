
## Qué voy a hacer (explicado simple)

Imagínate que tu sistema actual es una caja de herramientas que ya sirve para ver sitios, vales y entregas. Lo que vas a tener ahora es **una nueva ventana** dentro de la misma app que se llama **"Plano"**. Esa ventana muestra el dibujo del loteo (el SVG que mandaste) y, al pinchar un sitio o una manzana, te abre una ficha con los datos **reales** de tus vales — no inventados.

No voy a tocar el plano (mismos colores, mismas medidas, mismos IDs, mismas coordenadas). Solo lo voy a "enchufar" a los datos que ya están en el sistema.

---

## 1) Cómo se conecta el plano con los datos reales

El HTML crea sitios con IDs tipo `M{manzana}-S{sitio}` (ej: `M1-S57`, `M3-S6`). En tu base de datos, la tabla `sites` ya tiene los campos `manzana` (número) y `sitio` (texto). Entonces **el "puente" es simplemente: manzana + sitio**. Con eso uno cualquier rectángulo del plano con su fila real de `sites`.

Para el avance y el estado uso lo que **ya existe**:

- `src/lib/sites-compute.ts` → `buildMaps` + `cellStatus(site, valeType, maps)` ya calcula `complete | partial | empty | na` para cada vale de cada sitio. Es exactamente lo que necesita el plano para colorear.
- Avance % del sitio = vales completos / vales que le aplican × 100.
- Estado del sitio:
  - **Verde (terminado)**: todos los vales que aplican están `complete`.
  - **Amarillo (en ejecución)**: al menos un vale `partial` o `complete`, pero no todos.
  - **Gris (sin iniciar)**: ningún vale tiene entregas.
  - **Rojo (detenido)**: por ahora no existe un campo "bloqueado" en la base. Lo dejo definido como "sin entregas hace > X días" *opcional* — si no lo quieres por ahora, solo se usan los 3 colores reales y el rojo queda reservado para más adelante.

---

## 2) Archivos que voy a crear (nuevos)

1. `src/sections/plano.tsx` — la sección "Plano". Es un componente React que:
   - Trae los datos con los hooks que ya existen (`useSites`, `useValeTypes`, `useValeStages`, `useValeReqs`, `useSiteDeliveries`, `useSiteDeliveryItems`, `useMaterialsV2`).
   - Llama a `buildMaps` y, para cada sitio, calcula avance y estado.
   - Renderiza el SVG **idéntico** al del HTML (mismo `viewBox 0 0 627 745`, mismos rectángulos, mismas coordenadas, mismas clases CSS).
   - Filtros arriba: Vale tipo · Manzana · Tipo casa · Sitio (input) · Estado.
   - Al hacer click en un sitio → abre un panel lateral (uso `Sheet` de shadcn) con: sitio, manzana, tipo casa, avance %, barra de progreso, lista de vales con su estado, fecha de última entrega por vale, y materiales principales entregados. Botón "Abrir detalle" que reusa el diálogo del módulo Sitios existente (no duplico lógica).
   - Al hacer click en una manzana → panel con: total sitios, avance promedio, terminados / en ejecución / sin iniciar, y vales más atrasados.

2. `src/lib/plano-layout.ts` — un archivo con **solo los datos del SVG** (lista de sitios con `manzana, sitio, tipo, x, y, w, h, cls` y lista de `manzanas` con sus rectángulos y labels). Sacado tal cual del HTML, sin cambiar un pixel. Esto deja el `plano.tsx` limpio.

3. `src/lib/plano-compute.ts` — funciones puras:
   - `siteProgress(site, maps, valeTypes)` → `{ pct, status, valesDetail[] }`
   - `manzanaSummary(sites, maps, valeTypes)` → resumen agregado.
   - Helper `plano(valetipos, sitio, manzana, tipocasa)` expuesto (la función pública pedida) que retorna los sitios filtrados.

---

## 3) Archivos que voy a modificar (mínimo)

1. `src/components/app-shell.tsx` — agregar **una pestaña nueva** `"plano"` en `TabKey` y `TABS` (icono Map de lucide). Las pestañas existentes no se tocan.

2. `src/routes/index.tsx` — agregar la línea:
   ```
   {tab === "plano" && <PlanoSection />}
   ```
   y su import. Nada más.

**No se modifica**: `sites.tsx`, `deliveries.tsx`, `vale-tipo.tsx`, `sites-queries.ts`, `sites-compute.ts`, `sites-types.ts`, `admin.functions.ts`, ni la base de datos. Cero cambios de esquema.

---

## 4) Mapeo de IDs (importante)

El HTML genera IDs `M1-S57`, `M2-S3`, etc. para 102 sitios. Voy a usar **manzana + sitio** como llave de cruce con la tabla `sites` real:

- Si un sitio del plano **no existe** en la BD → se pinta gris claro y al click avisa "Sitio del plano sin datos en el sistema" (no rompe).
- Si un sitio existe en la BD pero **no está en el plano** → aparece en una pequeña alerta arriba: "X sitios reales no están dibujados en el plano". No los inventamos, solo se reporta.

Esto es para que tú veas la consistencia entre el SVG y la realidad sin que nada se rompa.

---

## 5) Filtros y función `plano(...)`

Mantengo la firma pedida:

```
plano(valetipos, sitio, manzana, tipocasa, estado?)
```

Internamente aplica las clases `is-hidden`, `is-highlight`, `is-selected` igual que el HTML original. Cuando `valetipos` está seteado, los colores de los rectángulos se recalculan **mostrando el estado de ese vale específico** en cada sitio (verde/amarillo/gris según `cellStatus`). Cuando no hay filtro de vale, se muestra el estado general del sitio.

---

## 6) Detalles técnicos (para revisión)

- **Datos**: usa los hooks `useSites/useValeTypes/...` ya existentes en `src/lib/sites-queries.ts`. Sin nuevas tablas, sin nuevas server functions.
- **SVG**: se renderiza desde JSX puro mapeando los arrays de `plano-layout.ts`. Mismos atributos: `viewBox="0 0 627 745"`, mismas clases (`lot`, `mz-area`, `small`, `estado-*`, `is-hidden`, etc.).
- **CSS**: los estilos específicos del plano viven scoped en `plano.tsx` con un `<style>` local (mismo CSS del HTML, solo el bloque del mapa). El resto de la app sigue con Tailwind.
- **Popups**: en vez del `div.popup` fixed del HTML, uso `Sheet` (shadcn) lateral derecho — consistente con el resto del sistema y responsive.
- **Performance**: 102 sitios → render trivial. `useMemo` para los cálculos de estado por sitio.

---

## 7) Lo que NO voy a hacer (compromiso)

- ❌ No rediseñar el SVG.
- ❌ No mover coordenadas.
- ❌ No cambiar IDs (`M{m}-S{n}` se mantiene).
- ❌ No reescribir vales, entregas, sites, dashboard.
- ❌ No agregar tablas ni migraciones.

---

## Resultado final

Una pestaña nueva **"Plano"** en el menú superior. Al entrar ves el loteo igualito al HTML, pero los colores reflejan tus vales reales. Filtras, pinchas, y ves información viva del sistema. Todo lo demás sigue funcionando exactamente como ahora.
