## Lo que vamos a hacer (en cristiano 🧱)

Hoy tenemos **dos mundos** en la app que no se hablan:
- **Inicio + Entregas** (lo viejo): mide por *tipo de casa*.
- **Sitios y Vales** (lo nuevo): mide por *manzana/sitio × vale tipo*, con etapas.

Vamos a conectarlos para que las entregas por vale **se vean en el Inicio**, agregamos un acceso rápido desde **Entregas**, y ponemos una **búsqueda** en todos los desplegables de materiales (que hoy son largos y molestos de scrollear).

---

## 1. Nueva pestaña "Por vale / sitio" en **Entregas**

En la sección **Entregas** (donde hoy hay 2 pestañas: *Por viviendas* y *Manual*) agregamos una **tercera pestaña**: **"Por vale / sitio"**.

Flujo dentro de la pestaña, paso a paso:
1. Eliges **Manzana** (con buscador).
2. Eliges **Sitio** (se filtra según la manzana).
3. Eliges **Vale tipo** (con buscador, agrupado por sección).
4. Eliges **Etapa** del vale.
5. Te muestra la tabla *Requerido / Ya entregado / Falta* y dos botones:
   - **Entregar manual** (escribes cantidades).
   - **Auto-completar lo que falta** (rellena con lo que falta).
6. Confirmas → queda registrado.

Por dentro reutiliza exactamente la misma lógica del diálogo que ya existe en *Sitios y Vales* — no duplicamos código, solo le ponemos otra puerta de entrada.

---

## 2. El **Inicio** muestra el avance de vales

En la pantalla de Inicio agregamos **4 cosas nuevas**, sin tocar lo que ya hay arriba:

### a) Tarjetas KPI "Avance Sitios × Vales"
Cuatro tarjetitas nuevas:
- **Combinaciones aplicables** (cuántos sitio×vale-tipo cuentan en total).
- **Completas** (verde, con %).
- **Parciales** (amarillo, con %).
- **Sin tocar** (gris, con %).

### b) Barra de avance **por manzana**
Una tarjeta con una barrita por cada manzana: *Manzana 1 → 12/40 vales completos (30%)*, *Manzana 2 → …*, etc.

### c) Las entregas por vale **suman en la "Tabla maestra de control"**
Hoy esa tabla mira solo las *Entregas* viejas. Vamos a hacer que también sume las entregas hechas por vale/sitio, **emparejando por código de material**. Así la columna **"Entregado"** refleja la realidad total, y de paso el **Saldo** queda correcto.

> ⚠️ Detalle importante: los materiales del mundo viejo (`materials`) y del nuevo (`materials_v2`) se unen por `code`. Si un material existe en uno y no en otro, igual aparecerá; simplemente quedará "huérfano" de un lado. Te lo aviso porque puede que veas alguna fila nueva en la tabla.

### d) Lista **"Últimas entregas por vale"**
Una tarjeta al final con las últimas 10 entregas (fecha · Manzana/Sitio · Vale · cuántos materiales), ordenadas de más reciente a más antigua.

---

## 3. **Búsqueda** en todos los selects de materiales 🔍

Hoy cuando hay que elegir un material, sale un Select gigante con scroll eterno. Lo reemplazamos por un **combobox con campo de búsqueda** (escribes "M00" o parte del nombre y te filtra).

Lugares donde aplica:
- **Entregas → Manual** (selector de material).
- **Entregas → Por vale/sitio** (selectores nuevos: manzana, sitio, vale).
- **Vale Tipo** (cuando se editan requerimientos de un vale).
- **Casas** y **Tipos de casa** (cuando se elige material para un requerimiento).
- **Recepciones** (selector de material).
- **Sitios y Vales** (los filtros de manzana/tipo casa/sección).

Hago **un solo componente reutilizable** (`SearchableSelect`) y lo enchufo en todos esos lugares — así si mañana mejora, mejora en todos lados.

---

## Lo que **NO** voy a tocar (para no romper nada)

- La estructura de la base de datos: no se crean ni borran tablas.
- Las entregas viejas (*Por viviendas* y *Manual*) siguen funcionando idénticas.
- La matriz colorida de *Sitios y Vales* queda igual (es la fuente de verdad).
- Reglas de stock, autenticación, ni el módulo de Materiales/Recepciones (solo se les cambia el desplegable por uno con buscador).

---

## Detalle técnico (por si te interesa, pero puedes saltar)

- Nuevo componente `src/components/searchable-select.tsx` basado en shadcn `Popover` + `Command` (que ya están en el proyecto).
- `src/sections/deliveries.tsx`: nueva `TabsTrigger` "Por vale/sitio" + un componente `<DeliverByValeTab/>` que importa y reutiliza `SiteValeDialog` / `DeliveryDialog` de `src/sections/sites.tsx` (los exporto).
- `src/sections/dashboard.tsx`: nueva sección KPIs (reutiliza `buildMaps` y `cellStatus` de `sites.tsx`, los muevo a `src/lib/sites-compute.ts`), barra por manzana, fusión de `site_delivery_items` agregados por `material_code` dentro de `masterRows`, y lista de últimas entregas.
- Sin cambios de schema ni migraciones; todo se calcula en cliente con las queries ya existentes.

---

¿Le damos? Si algo no te cuadra dime y lo ajustamos antes de tocar código. 👍