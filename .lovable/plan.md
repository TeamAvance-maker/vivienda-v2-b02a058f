# Plan: unir la configuración de casas en un solo lugar

## La idea, en simple

Hoy la información de las casas vive en 3 lugares distintos del menú de arriba:
- **Tipos vivienda** (A1, A2, B, C y cuántas hay de cada uno)
- **Sitios y Vales** (las manzanas y sitios, con su tipo)
- **Vale Tipo** (los vales/etapas con materiales)

Vamos a juntar esos tres en **una sola sección** del menú llamada **"Casas"**, con 3 pestañas internas. Además, la cantidad de cada tipo (ej: "A1 = 20") ya no se escribirá a mano: la app la contará sola mirando los sitios registrados.

## Cómo se verá

```text
Menú de arriba:
  Sitios y Vales  ·  Inicio  ·  Recepciones  ·  Entregas  ·  Inventario
  [Casas]  ·  Materiales  ·  Reportes  ·  Configuración

Al entrar en "Casas":
  ┌─ Pestañas ────────────────────────────────┐
  │  [Tipos]  [Manzanas/Sitios]  [Vales tipo] │
  └───────────────────────────────────────────┘
```

- **Tipos**: lista los tipos (A1, A2…) con la cantidad **calculada automáticamente** desde los sitios. Aquí solo se crea/edita/elimina el tipo (código y nombre). La columna "Cantidad" será de solo lectura con la cuenta real.
- **Manzanas/Sitios**: lo que hoy está en "Sitios y Vales", parte de gestionar sitios.
- **Vales tipo**: lo que hoy está en "Vale Tipo".

> Nota: la pestaña "Sitios y Vales" actual hace **dos cosas** (gestionar sitios + ver el cuadro de entregas por sitio). Solo movemos la parte de **gestionar manzanas/sitios** a "Casas". El **cuadro de seguimiento de entregas** se queda donde está (es operación diaria, no configuración).

## Cambios concretos

1. **Menú** (`src/components/app-shell.tsx`)
   - Quitar las pestañas: `tipos`, `vale_tipo`.
   - Renombrar `sitios` → sigue siendo "Sitios y Vales" (el cuadro de seguimiento).
   - Agregar nueva pestaña `casas` con ícono y label "Casas".

2. **Nueva sección** `src/sections/casas.tsx`
   - Componente con 3 pestañas (shadcn `Tabs`): Tipos / Manzanas / Vales tipo.
   - Cada pestaña reutiliza el contenido de las secciones actuales (`house-types.tsx`, parte de `sites.tsx` para crear manzanas/sitios, y `vale-tipo.tsx`).

3. **Cantidad automática por tipo**
   - En la pestaña "Tipos", la columna **Cantidad** mostrará el conteo de sitios de ese tipo (consulta a la tabla `sites`).
   - Se elimina el input manual de cantidad al crear/editar un tipo.
   - El indicador "Total configurado / objetivo" sigue funcionando, pero ahora el total viene de los sitios reales.

4. **Sitios** (`src/sections/sites.tsx`)
   - Se mantiene aquí el **cuadro de seguimiento de entregas por sitio** (la parte diaria).
   - La parte de **crear/editar manzanas y sitios** se expone también dentro de "Casas → Manzanas" (mismo componente, reutilizado).

5. **Enrutado del menú** (`src/routes/index.tsx`)
   - Mapear `casas` → `<CasasSection />`.
   - Quitar los mapeos viejos de `tipos` y `vale_tipo` (o redirigirlos a `casas` por compatibilidad).

## Lo que NO cambia

- La base de datos: no se tocan tablas ni columnas.
- La lógica de vales, entregas, inventario, reportes.
- La contraseña sigue pidiéndose para modificar/eliminar.

## Pregunta abierta (la respondo yo si no me dices)

Si un tipo (ej: "C") **no tiene sitios cargados todavía**, su cantidad mostrará 0. Eso está bien para el conteo real, pero perdemos el concepto de "cantidad objetivo por tipo". Si necesitas planificar antes de cargar sitios, podemos sumar un campo opcional **"objetivo"** que solo sirva como referencia visual. Si no me dices nada, lo dejo simple: solo conteo real.
