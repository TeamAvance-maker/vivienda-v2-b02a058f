## Informe dinámico de materiales por cantidad de casas y vales

Crear una sección nueva llamada **"Simulador / Informe dinámico"** donde el usuario arma un escenario hipotético y obtiene la lista exacta de materiales necesarios.

### Cómo se usará (ejemplo del usuario)

1. El usuario abre la nueva sección desde el menú lateral.
2. Llena un formulario con 3 partes:
   - **Cantidad de casas por tipo** (A1, A2, B, C). Ej: A1 = 29, B = 1, A2 = 0, C = 0.
   - **Vales tipo a incluir** (lista con casillas): Agua Potable Interna, Acometida, etc. Puede marcar varios.
   - **Etapas a incluir** por cada vale marcado: por defecto "todas", pero puede limitar (ej: del vale "Cubierta" solo la etapa 3).
3. Aprieta **"Calcular"** y aparece debajo una tabla con:
   - Código de material · Descripción · Cantidad total necesaria · Stock actual · Faltante (rojo si > 0)
4. Botones para **exportar a Excel** y **PDF** del informe generado, con el título del escenario (ej: "Informe: 29×A1 + 1×B — Agua potable + Acometida + Cubierta E3").

### Detalles funcionales

- El cálculo es 100% en el frontend: multiplica `vale_reqs.qty × cantidad_casas` por cada combinación (etapa, tipo_casa, material) que el usuario seleccionó, y suma por material.
- **No** descuenta lo ya entregado ni modifica nada en la base de datos — es un simulador puro.
- El stock actual se muestra solo como referencia (de `useVStock`).
- Búsqueda/filtros y paginación reutilizan los componentes existentes (`useTableControls`, `TableToolbar`).
- La selección de vales y etapas usa el mismo patrón visual que ya usa la sección "Vale Tipo".

### Archivos a tocar (sólo frontend)

- **Nuevo:** `src/sections/simulator.tsx` — la sección completa.
- **Editar:** `src/components/app-shell.tsx` — agregar ítem "Simulador" en el menú lateral con un icono (ej: `Calculator`).
- **Editar:** `src/routes/_authenticated/index.tsx` (o donde se enruten las secciones) — registrar la nueva sección.
- **Editar:** `src/lib/help-content.ts` — agregar ayuda corta de la nueva sección.

Sin cambios en base de datos, sin nuevas server functions, sin tocar inventario ni entregas.
