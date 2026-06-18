# Plan de mejoras (7 puntos)

Voy paso a paso, con calma, y solo aplico cambios después de tu visto bueno. Te lo explico simple:

---

## 1. Fecha que "se corre un día"

**Problema:** al guardar `18-06-2026` aparece `17-06-2026`. Pasa porque el sistema interpreta la fecha como UTC y al mostrarla en tu zona horaria (Chile) le resta horas.

**Solución:** en `src/lib/compute.ts` la función `fmtDate` va a parsear `YYYY-MM-DD` como fecha local (partiendo el string), nunca con `new Date(str)`. Lo mismo en todos los lugares donde se muestra fecha (recepciones, entregas, reportes, sitios, etapas, conteos). Los `<input type="date">` ya guardan correctamente `YYYY-MM-DD`, así que el dato en base no cambia: solo se corrige el render. Sin que desaparezca el calendario.

---

## 2. Menú lateral izquierdo (vertical) que se auto-oculta

**Solución:** reemplazar la barra superior `TABS` por una barra vertical fija a la izquierda:

- 56px de ancho colapsada (solo íconos), 240px expandida (íconos + texto).
- Se expande al pasar el mouse y se vuelve a colapsar al salir (con un retardo de ~200ms para no parpadear).
- En móvil: se transforma en un cajón (drawer) que abre con un botón hamburguesa.
- Indicador activo: barra vertical de color primario al lado izquierdo del ítem.
- Animación suave con `framer-motion`.

**Archivos:** `src/components/app-shell.tsx` (rehacer layout) y `src/routes/index.tsx` (sin cambios de lógica).

---

## 3. Modo claro y oscuro estilo "Boutique Café Premium"

**Solución:** definir paleta en `src/styles.css` con tokens semánticos `oklch` para ambos modos:

- **Claro:** crema cálido (#FBF7F0), café espresso para texto, dorado champagne como acento, sombras suaves.
- **Oscuro:** marrón muy oscuro casi negro, crema apagado para texto, mismo dorado como acento.
- Botón toggle (sol/luna) en el sidebar (abajo).
- Persistir preferencia en `localStorage` (`theme`) y aplicar clase `dark` en `<html>`.
- Respetar `prefers-color-scheme` por defecto.

**Archivos:** `src/styles.css`, nuevo `src/components/theme-toggle.tsx`, `src/routes/__root.tsx` (script de carga inicial sin flash).

---

## 4. Nuevo respaldo y restauración (completo + restaurar por partes)

**Solución:** botar `src/lib/backup.functions.ts` actual y crear uno nuevo:

- **Respaldo:** descarga JSON con TODAS las tablas del proyecto (incluye `materials_v2`, `vale_types_v2`, `vale_stages`, `vale_reqs`, `sites`, `site_deliveries`, `site_delivery_items`, `house_types`, `house_material_req`, `house_exec_overrides`, `inventory_counts`, `inventory_adjustments`, `receptions`, `deliveries`, `delivery_items`, `delivery_houses`, `project_config`). Incluye versión, fecha y conteo por tabla.
- **Restauración por partes:** al cargar el archivo, mostrar una lista con checkboxes (una tabla por línea con su cantidad de registros). El usuario marca las tablas que quiere restaurar. Se respeta el orden de dependencias (padres primero al insertar, hijos primero al borrar). Pide contraseña.
- Validación: si selecciona una tabla hija sin la padre y la padre actual está vacía, advierte antes de continuar.

**Archivos:** reescribir `src/lib/backup.functions.ts`, actualizar `src/sections/config.tsx`.

---

## 5. Crear material "al vuelo" en Recepciones y Entregas

**Solución:** en el `SearchableSelect` de material, agregar al final una opción **"+ Crear nuevo material…"**. Al pulsarla abre un diálogo modal con los campos mínimos (código, descripción, unidad, ¿sigue sentido?, contraseña). Al guardar:

- Se inserta vía `adminMutateFn`.
- Se refresca la lista de materiales.
- El nuevo código queda automáticamente seleccionado en el formulario que estabas llenando.
- **No se pierde nada** de lo que ya tenías escrito (guía, fecha, cantidad, etc.) porque el diálogo es independiente del formulario padre.

**Archivos:** nuevo `src/components/material-quick-create.tsx`, modificar `src/sections/receptions.tsx` y `src/sections/deliveries.tsx` (y también `sites.tsx` que tiene panel de vale).

---

## 6. Borrado en cascada con bitácora (auditoría)

**Solución:** crear una tabla `deletion_log` que guarda CADA registro borrado (incluso los hijos por cascada) con:

- `id`, `deleted_at`, `deleted_by` (por ahora "superadmin"), `table_name`, `record_id`, `record_snapshot` (JSON completo del registro), `parent_table`, `parent_id`, `reason` (texto opcional).
- La tabla es **append-only**: solo INSERT, sin UPDATE ni DELETE (RLS + revoke).

Nueva función servidor `cascadeDeleteFn(table, id, password, reason?)`:

1. Verifica contraseña.
2. Calcula recursivamente todos los descendientes (ej. borrar un `vale_type` → trae sus `vale_stages` → sus `vale_reqs`, etc.).
3. Por cada registro: guarda snapshot en `deletion_log` → luego lo borra.
4. Devuelve resumen: cuántos registros se borraron por tabla.

UI: en cada sección que tenga botón eliminar, al pulsar muestra confirmación con preview: "Se eliminarán: 1 vale, 3 etapas, 24 requisitos. ¿Continuar?" + campo de motivo opcional + contraseña. Y que muestre el detalle de lo que se eliminará, que el usuario entienda que al eliminar un material se modificará el vale tipo del sitio, manzana, etc. que se eliminará el registro de la recepcion, etc.

Nueva pestaña en Configuración: **"Bitácora de eliminaciones"** con tabla filtrable por fecha/tabla/usuario, solo lectura, con botón exportar a CSV.

**Archivos:** migración nueva (`deletion_log` + grants + RLS), `src/lib/admin.functions.ts` (nueva fn), modificar todas las secciones con borrado, nueva sección bitácora en `src/sections/config.tsx`.

---

## 7. Botón "Inicializar sistema" en Configuración

**Solución:** botón rojo destacado en Configuración (sección **"Zona peligrosa"**) que:

- Pide contraseña de superadmin (la misma actual).
- Pide escribir literalmente la palabra `INICIALIZAR` para confirmar.
- Muestra advertencia clara: "Se borrarán TODOS los datos: materiales, vales, sitios, entregas, recepciones, conteos. Esta acción NO se puede deshacer."
- Borra todos los registros de  las tablas en orden seguro (hijos primero).
- Registra una entrada resumen en `deletion_log` con motivo "Inicialización del sistema".
- NO toca `project_config` (mantiene nombre de obra y umbral).

**Archivos:** nueva fn `resetSystemFn` en `src/lib/admin.functions.ts`, sección "Zona peligrosa" en `src/sections/config.tsx`.

---

## Orden de ejecución

1. Migración: tabla `deletion_log` (te la presento por separado para tu aprobación).
2. Fix de fecha (rápido y aislado).
3. Tema claro/oscuro + sidebar lateral (cambios visuales, juntos para no romper layout intermedio).
4. Crear material al vuelo.
5. Respaldo/restauración nueva.
6. Borrado en cascada con bitácora.
7. Inicialización del sistema.

## Verificación

Después de cada paso: `tsc --noEmit`, prueba manual en preview, revisión de consola y red. No avanzo al siguiente si hay error.

## Lo que NO toco

- Lógica de cálculo de plano, sitios, entregas, vales.
- Esquemas existentes (solo agrego `deletion_log`).
- Archivos auto-generados de Supabase ni `routeTree.gen.ts`.

¿Te parece bien así o quieres ajustar algún punto antes de empezar?