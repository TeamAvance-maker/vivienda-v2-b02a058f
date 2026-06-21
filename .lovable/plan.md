## Cambios al panel "Ver Detalle" del Dashboard

Voy a transformar el panel lateral en una **vista de pantalla completa** con botones fijos arriba y abajo.

### 1. Panel a pantalla completa
En `src/sections/dashboard.tsx`, cambiar el `<SheetContent side="right" className="sm:max-w-xl ...">` por uno que ocupe **toda la pantalla**:
- `side="right"` se mantiene, pero con `className="w-screen max-w-none sm:max-w-none h-screen flex flex-col p-0"`.
- El contenido interior se organiza en 3 zonas verticales con `flex flex-col`:
  - **Barra superior fija** (header sticky) con título + botón **"← Volver"** a la derecha (cierra el panel, `onClick={() => setOpen(false)}`).
  - **Zona central con scroll** (`flex-1 overflow-y-auto p-6`) que contiene todas las secciones actuales (Resumen general, Materiales con déficit, Materiales ajustados, Sitios pendientes por tipo, Vales incompletos).
  - **Barra inferior fija** (footer sticky) con dos botones: **"Exportar a Excel"** y **"Exportar a PDF"**.

Los botones de arriba y abajo siempre visibles (no se mueven al hacer scroll).

### 2. Exportar a Excel
- Usar la librería **`xlsx`** (SheetJS) que ya es estándar y liviana. Si no está instalada, agregarla con `bun add xlsx`.
- Función `exportarExcel()` que arma un libro con varias hojas:
  - **Resumen** (KPIs generales)
  - **Materiales con déficit**
  - **Materiales ajustados**
  - **Sitios pendientes por tipo**
  - **Vales incompletos**
- Descarga el archivo como `resumen-stock-AAAA-MM-DD.xlsx`.

### 3. Exportar a PDF
- Usar **`jspdf`** + **`jspdf-autotable`** (también estándar y liviano) para generar un PDF con las mismas tablas.
- Encabezado con título "Resumen detallado de stock" y fecha.
- Una sección por cada bloque del panel, en orden.
- Descarga como `resumen-stock-AAAA-MM-DD.pdf`.

### 4. Memoria
Agregar a `mem://rules/global-input-rules`:
> Los paneles tipo "Ver Detalle" deben ocupar pantalla completa, con un botón fijo arriba "Volver" y botones fijos abajo para "Exportar a Excel" y "Exportar a PDF" cuando muestren datos tabulares.

### Archivos a modificar
- `src/sections/dashboard.tsx` — Sheet a pantalla completa, header/footer sticky, funciones `exportarExcel()` y `exportarPDF()`.
- `package.json` (vía `bun add`) — agregar `xlsx`, `jspdf`, `jspdf-autotable` si no están.
- `mem://rules/global-input-rules` — nueva regla del panel detalle.

### Sin cambios
- Cálculos del indicador, KPIs, lógica de v2, navegación entre secciones.
