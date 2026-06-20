
# Plan: Historial de cambios entendible (Configuración)

## 1. Estado de bloqueos
- Todo el sitio queda **bloqueado** otra vez (no se aceptan cambios).
- Se **desbloquea sólo Configuración** (`src/sections/config.tsx` y lo que use).
- Recepciones ya cumple las reglas globales (búsqueda por tokens + sin flechitas) → no se vuelve a tocar.
- Se actualiza `mem://index.md` con el nuevo estado de bloqueo.

## 2. Qué se cambia (resumen para ti, sin tecnicismos)

Hoy la tarjeta se llama "Bitácora de eliminaciones" y sólo guarda lo que se **borra**. Además, el usuario sólo ve códigos largos tipo `a7416506-df6a-4114-…` y nombres internos como `site_delivery_items`, así que no entiende qué se eliminó.

Lo que vamos a tener después:

- Nuevo nombre: **"Historial de cambios"** (en vez de "Bitácora de eliminaciones").
- Guarda **dos cosas**: lo que se **modificó** y lo que se **eliminó** (simple o en cascada).
- Cada línea responde 4 preguntas en lenguaje normal:
  1. **¿Qué cosa?** — identificador humano: "Recepción guía G‑00012345 del 12‑06‑2026 — Tubo PPR 75×50", "Vale V1 · Etapa 2 — Casa A1", "Material PVC‑40 · Tubo PVC 40 mm", etc.
  2. **¿Qué pasó?** — chip verde "Modificado" o chip rojo "Eliminado" (y si fue en cascada, un chip naranja "Eliminado en cascada").
  3. **¿Cuándo y quién?** — fecha + hora + usuario (por ahora "superadmin").
  4. **¿Por qué?** — motivo escrito al confirmar la acción.
- Botón **"Ver detalle"** en cada fila que abre una ventana con:
  - Para modificaciones: tabla comparativa **Antes → Después** sólo de los campos que cambiaron.
  - Para eliminaciones en cascada: lista en árbol de TODO lo que se borró junto, p. ej.
    ```text
    Vale V1 — Casa A1
    └─ Etapa 2 — Instalaciones
       ├─ Requisito: Tubo PPR 75 (10 u)
       └─ Entrega a sitio del 12‑06‑2026
          ├─ Tubo PPR 75 (2 u)
          └─ Codo PPR 75 (4 u)
    ```
  - Datos completos (JSON) plegados al final, por si se necesita.
- Filtros arriba, **activables/desactivables** con un click:
  - "Sólo modificaciones" / "Sólo eliminaciones" / "Todo".
  - Tipo de registro con nombres amigables: *Recepciones, Entregas, Vales, Materiales, Casas, Conteos, Sitios…* (en vez de los nombres técnicos).
  - Buscador que busca por identificador humano, motivo, guía/factura, código de material, etc.
  - Rango de fechas (desde / hasta).
- Exportar CSV sigue funcionando, pero también con las columnas amigables.

## 3. Cambios técnicos

### 3.1 Base de datos (migración)
- Renombrar concepto: **mantener la tabla** `deletion_log` (no se pierden los 16 registros existentes) pero ampliarla:
  - `action text not null default 'delete'` con valores `insert | update | delete | cascade_delete`.
  - `changes jsonb` — diff de campos para updates (`{ campo: { antes, despues } }`).
  - `record_label text` — etiqueta humana ya calculada al guardar.
  - Renombrar lógicamente a "historial" sin renombrar la tabla (para no romper backups existentes). Se documenta.
- GRANTs ya están; sólo añadimos columnas.
- Backfill: a las 16 filas viejas se les pone `action='delete'` y `record_label` derivado del snapshot.

### 3.2 Registro de modificaciones (nuevo)
- En `src/lib/admin.functions.ts` → `adminMutateFn`: antes de `update`/`delete`, leer el registro original, calcular el `changes` (sólo campos que cambian) y escribir una fila en `deletion_log` con `action='update'` o `action='delete'`, `record_snapshot` (estado previo) y `record_label`.
- En `src/lib/backup.functions.ts` → `cascadeDeleteFn`: añadir `action='cascade_delete'` al padre y a los hijos, y reutilizar `batch_id` para agruparlos en el detalle de árbol.
- En `src/lib/material-replace.functions.ts` (reemplazo de material): también registrar la modificación masiva como un solo `batch_id` con `action='update'`.

### 3.3 Etiquetas humanas (`record_label`)
Función `humanLabel(table, snapshot)` server-side que produce:
- `receptions` → `"Recepción {guia} · {fecha} · {material}"`
- `deliveries` / `delivery_items` / `delivery_houses` → `"Entrega del {fecha} · {casa/sitio}"`
- `materials_v2` → `"Material {code} · {description}"`
- `house_types` → `"Tipo casa {code} · {name}"`
- `house_material_req` → `"Requisito {house_type} · {material} ({qty})"`
- `vale_types_v2` / `vale_stages` / `vale_reqs` → `"Vale {code} · Etapa {n} · {material}"`
- `sites` / `site_deliveries` / `site_delivery_items` → `"Sitio {nombre} · Entrega del {fecha}"`
- `inventory_counts` / `inventory_adjustments` → `"Conteo de {material} ({fecha})"`
- `house_exec_overrides` → `"Ajuste manual {casa} · {material}"`
- `project_config` → `"Configuración del proyecto"`

### 3.4 UI nueva en Configuración
Reemplazar `DeletionLogCard` en `src/sections/config.tsx` por `HistoryCard`:
- Encabezado: "Historial de cambios — modificaciones y eliminaciones del sistema".
- Barra de filtros: chips toggle "Modificaciones / Eliminaciones / Cascada", selector de tipo de registro (con etiqueta amigable), buscador (tokens), fecha desde/hasta, contador, "Exportar CSV".
- Tabla: **Fecha y hora · Usuario · Qué pasó · Qué cosa (identificador humano) · Motivo · Detalle**.
- Columna "Detalle" abre un `Dialog`:
  - Modificación → tabla **Antes / Después** sólo con campos cambiados.
  - Eliminación en cascada → árbol agrupado por `batch_id` con los hijos.
  - Pie con JSON crudo plegable ("Ver datos completos").
- Búsqueda y filtros con la **regla global de tokens** (igual que Recepciones); también se aplica al resto de inputs nuevos. Esto queda registrado para no re‑verificarlo: Configuración → Historial cumple las reglas globales.

### 3.5 Diálogos de confirmación
- `requestAdminMutation` (modificaciones simples): añadir campo opcional "Motivo" como ya tiene el de cascada, para que el historial muestre el "por qué".
- `requestCascadeDelete`: el preview ya está, sólo se reusa.

## 4. Memoria
- `mem://index.md`: marcar "Sitio bloqueado salvo **Configuración** (sección Historial) y **Recepciones** desbloqueados".
- `mem://rules/global-input-rules.md`: añadir "Módulos ya verificados: Recepciones, Configuración (Historial)".

## 5. Lo que NO cambia
- Diseño visual (estilo "Boutique Café") y resto de tarjetas de Configuración (Respaldo, Restauración, Zona peligrosa) → intactos.
- Datos existentes en `deletion_log` se conservan.
- Resto de módulos sigue bloqueado.

¿Apruebas el plan o quieres ajustar algo (nombres de columnas amigables, orden de filtros, etiquetas humanas)?
