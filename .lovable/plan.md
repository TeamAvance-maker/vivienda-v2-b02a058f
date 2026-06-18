## Manual de Usuario — Centro de Ayuda

Voy a crear un sistema de ayuda profesional, integrado en dos lugares (como pediste):

### 1. Botón flotante "?" (esquina inferior derecha)
- Círculo discreto con icono de interrogación, siempre visible en todas las secciones.
- Color sutil que combina con el tema Boutique Café (claro/oscuro).
- Animación suave al pasar el mouse, con tooltip "Ayuda".

### 2. Entrada "Ayuda" en el menú lateral
- Justo arriba de "Configuración", con icono de libro/salvavidas.
- Abre el mismo panel de ayuda.

### Formato del manual (la parte profesional y moderna)
Un **panel lateral deslizante desde la derecha** (estilo Intercom / Notion Help), porque:
- No interrumpe lo que el usuario está viendo (puede leer ayuda y mirar la pantalla a la vez).
- Es el patrón más usado en software profesional moderno.
- Funciona bien en pantallas grandes y móvil.

**Contenido del panel:**
- **Barra de búsqueda** arriba: busca en preguntas y respuestas.
- **Secciones organizadas** con acordeón (se expanden al hacer clic), una por cada menú del sistema:
  1. 🏠 Inicio — Qué muestra el panel principal
  2. 🗺️ Plano — Cómo usar el plano, filtros por etapa, búsqueda de vale tipo
  3. 📦 Materiales — Crear/editar materiales, unidades, vale tipo
  4. 📥 Recepciones — Registrar entradas de material, fechas, paginación
  5. 🚚 Entregas — Entregar a sitios, ver historial
  6. 🏘️ Casas — Tipos de casa, asignación
  7. 📋 Inventario — Stock actual, ajustes
  8. 📊 Reportes — Filtros tipo Excel, exportar
  9. ⚙️ Configuración — Respaldo/restauración, inicialización, contraseña superadmin

Cada sección con 4–8 preguntas frecuentes en formato **¿Pregunta? → Respuesta corta y clara**, escritas en lenguaje sencillo (sin tecnicismos).

- **Pie del panel:** versión del sistema y mensaje "¿No encuentras lo que buscas?".

### Archivos a crear/modificar
- `src/components/help-panel.tsx` — el panel deslizante con buscador, acordeón y contenido.
- `src/lib/help-content.ts` — el manual completo (preguntas y respuestas por sección), separado para mantenerlo fácil de actualizar.
- `src/components/help-fab.tsx` — botón flotante "?".
- `src/components/app-shell.tsx` — agregar entrada "Ayuda" en sidebar (arriba de Configuración) y montar el FAB.

### Detalles técnicos
- Reuso de componentes shadcn existentes (`Sheet`, `Accordion`, `Input`, `Button`).
- Animación con framer-motion (ya está en el proyecto).
- Tokens semánticos del tema — funciona en claro y oscuro automáticamente.
- Sin cambios en backend, sin nuevas dependencias.
