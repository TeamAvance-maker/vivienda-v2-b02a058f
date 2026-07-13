## Problema

En la sección **Materiales**, al presionar "Agregar material" sale el error rojo:
`new row violates row-level security policy for table "materials_v2"`

### Por qué pasa (explicado simple)

Piensa en la base de datos como una caja fuerte 🔐. Cuando activamos la seguridad (RLS) hace unas semanas, le dijimos: *"solo deja **mirar** los materiales a usuarios aprobados"*. Pero **no le dimos permiso para meter materiales nuevos** desde el navegador.

El formulario de "Agregar material" hoy escribe **directamente** desde el navegador (sin la contraseña de obra), y la caja fuerte lo rechaza. En cambio, el botón "Editar" sí funciona porque usa la ruta segura del servidor (`adminMutateFn`) con contraseña.

## Solución propuesta

Cambiar el botón "Agregar material" para que use la **misma ruta segura** que ya usa "Editar":

1. En `src/sections/materials.tsx`, reemplazar el `supabase.from(...).insert(...)` directo por una llamada a `adminMutateFn` (server function que ya existe y ya bypasea RLS de forma controlada).
2. Pedir la **contraseña de obra** en un pequeño diálogo antes de crear el material (igual que hoy pide para editar/borrar), para no dejar la creación abierta a cualquiera.
3. Al terminar, refrescar la lista automáticamente.

**No** vamos a abrir la política RLS de `materials_v2` a INSERT desde el navegador — sería un agujero de seguridad (cualquier usuario aprobado podría inyectar materiales sin control). La ruta con contraseña es coherente con el resto del sitio.

## Alcance

- Un solo archivo tocado: `src/sections/materials.tsx`.
- Sin cambios en la base de datos, sin nuevas migraciones, sin tocar otras secciones.

## Detalles técnicos

- Usar `useServerFn(adminMutateFn)` con `{ table: "materials_v2", action: "insert", values: {...} }`.
- Añadir estado local `addPass` y un `AlertDialog` reutilizando el patrón del diálogo de edición ya existente en el mismo archivo.
- `sort_order` y `code` (autogenerado con `nextCode`) se calculan igual que ahora.

¿Le damos? 🚀
