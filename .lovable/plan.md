# Plan de cambios

## 1. Plano — color de texto en badges de estadísticas

En `src/sections/plano.tsx` (líneas ~304-326) los badges de "Distribución por tipo" y los de la etapa/vale (Completo / Parcial / Sin entregar / N/A) llevan un `background` claro inline (`#bbf7d0`, `#fde68a`, `#f8fafc`, `TIPO_FILL[k]`) pero heredan el color de texto blanco del tema oscuro, por lo que se ven ilegibles.

**Acción**: añadir `color: "#000"` (y `borderColor` para mantener contorno) a esos badges con `style` inline, sin tocar la lógica ni los valores de fondo.

Badges afectados:
- `Distribución por tipo` → A1, A2, B, C (línea 306)
- Bloque de etapa/vale → Completo, Parcial, Sin entregar, N/A (líneas 320-325)

## 2. Menú Entregas — búsqueda en selects de vale + etapas

Revisión hecha de `src/sections/deliveries.tsx`:

| Ubicación | Selector | Estado actual |
|---|---|---|
| Pestaña "Por vale" | Manzana / Sitio / Vale tipo | Ya usa `SearchableSelect` ✅ |
| Pestaña "Por grupo de casas" | Manzana / Tipo / Vale / Etapa | Ya usa `SearchableSelect` ✅ |
| Diálogos de edición (fecha, qty) | — | No tienen selects de vale |

Faltante respecto al pedido: en la pestaña **"Por vale"** el listbox de Vale tipo no muestra las etapas; el panel se abre para el vale completo. Para cumplir "no olvidar agregar las etapas de los vales" haré que ese selector sea jerárquico igual que el filtro del Plano:

- Una sola lista combinada **Vale → Etapas** con búsqueda.
- Al elegir un vale: se abre el panel del vale (comportamiento actual).
- Al elegir una etapa específica: se abre el mismo panel y se hace scroll/foco en esa etapa (o se preselecciona internamente; si no es trivial, se deja igual y solo se muestra la etapa como etiqueta informativa para mantener el flujo actual sin romperlo).

Si el preseleccionado de etapa dentro del `SiteValeDialog` requiere cambios al componente compartido en `src/sections/sites.tsx`, se limitará a pasar un prop opcional `initialStageId` sin alterar el comportamiento por defecto.

## 3. Verificación

- Build limpio.
- Revisar visualmente el plano: badges con texto negro legible sobre fondos claros.
- Probar pestaña "Por vale" en Entregas: búsqueda funciona, se listan vales y sus etapas, al elegir un vale o etapa se abre el panel sin errores.
- Probar pestaña "Por grupo de casas": sin regresiones.

## Archivos a modificar

- `src/sections/plano.tsx` — solo `style` inline de badges.
- `src/sections/deliveries.tsx` — combinar vale+etapa en `SearchableSelect` de "Por vale".
- `src/sections/sites.tsx` — (solo si hace falta) añadir prop opcional `initialStageId` a `SiteValeDialog`.

No se tocan: lógica de vales, datos, RLS, módulo de recepciones, plano (coordenadas/SVG), ni otros menús.
