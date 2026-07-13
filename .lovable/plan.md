## Qué hay hoy 🧒

En la sección **Vales tipo** hoy solo puedes:
- ➕ Crear un vale tipo nuevo (con etapa inicial).
- 📋 Elegir un vale del selector de arriba y cargarle materiales.
- 🖨️ Imprimir / exportar a PDF.

Pero **no puedes** renombrar un vale, cambiar su sección, ni eliminarlo. Eso es lo que falta para tener un CRUD completo.

## Qué haré

Convertir el botón único **"Nuevo vale tipo"** en un **panel de gestión de vales tipo** con las 4 acciones clásicas (Crear, Leer, Actualizar, Eliminar), sin tocar la parte de materiales/etapas que ya funciona.

### 1. Nuevo botón "Administrar vales tipo"
Al lado del actual "Nuevo vale tipo", abre un diálogo grande con la **lista de todos los vales tipo** (código, nombre, sección, fecha de creación, nº de etapas). Con:
- 🔎 Buscador por tokens (misma regla global).
- 📄 Paginación de 10 (regla global).
- Botones por fila: **Editar ✏️** y **Eliminar 🗑️**.
- Botón arriba: **➕ Nuevo** (reutiliza el diálogo existente).

### 2. Editar vale tipo (Update) ✏️
Diálogo con:
- **Nombre** (obligatorio).
- **Sección** (opcional).
- **Contraseña de obra**.

El **código** (V01, V02…) NO se puede cambiar — es el ID único y hay muchos datos ligados a él. Se muestra como solo lectura.

Guarda con `adminMutateFn` → `update` sobre `vale_types_v2`. Queda en el historial automáticamente.

### 3. Eliminar vale tipo (Delete) 🗑️
Usa el diálogo de **borrado en cascada** que ya existe (`requestCascadeDelete`) para avisar en rojo que se borrarán también:
- Todas sus etapas (`vale_stages`).
- Todos los materiales asignados en esas etapas (`vale_reqs`).

Pide contraseña de obra y motivo. Queda en historial.

Si el vale seleccionado arriba era el que borraste, el selector se limpia solo.

### 4. Crear (ya existe, sin cambios)
Reutilizo el diálogo actual "Nuevo vale tipo" — solo lo abro también desde el panel.

## Alcance técnico

- **Un solo archivo tocado**: `src/sections/vale-tipo.tsx`.
- **Sin migraciones** ni cambios en base de datos.
- **Sin nuevas server functions**: uso `adminMutateFn` (update) y `requestCascadeDelete` (delete en cascada) que ya existen.
- Refresco de datos con `invalidate()` de `useInvalidateSitesV2` (ya se usa).

## Fuera de alcance

- No cambio el CRUD de materiales dentro del vale (ya funciona).
- No cambio el CRUD de etapas dentro del vale (ya funciona).
- No cambio el código autogenerado ni el formato V##.

¿Le damos? 🚀
