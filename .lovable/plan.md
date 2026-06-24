# Paquete de documentación técnica y funcional del sistema

Voy a generar un **dossier completo** del sistema, pensado para que un ingeniero informático y un equipo de analistas/programadores puedan entenderlo, mantenerlo o reescribirlo sin hablar contigo. Se entrega como archivos descargables en `/mnt/documents/` (Markdown + PDF + diagramas).

---

## Qué incluye el paquete (te lo explico como si fuera una carpeta de oficina)

### 1. **README principal** (`00_README.md` + PDF)

Portada, índice, a quién va dirigido, glosario (manzana, sitio, vale, etapa, recepción, entrega, etc.) y cómo leer el resto de documentos.

### 2. **Visión general del producto** (`01_vision_general.md`)

- Para qué sirve el sistema (control de obra: materiales, vales, sitios, recepciones, entregas, stock).
- Quién lo usa (superadmin, equipo de obra).
- Explicación "normal" (para no técnicos) + explicación técnica.

### 3. **Stack tecnológico y plataforma** (`02_stack.md`)

- Lenguajes: TypeScript, SQL (PostgreSQL), HTML/CSS.
- Framework: TanStack Start v1 (React 19 + Vite 7) — SSR + server functions.
- Estilos: Tailwind CSS v4 + shadcn/ui + tema claro/oscuro "Boutique Café".
- Backend: Lovable Cloud (Supabase: PostgreSQL + Auth + Storage + Edge).
- Hosting: Cloudflare Workers (edge).
- Librerías clave: TanStack Query, TanStack Router, Zod, jsPDF, XLSX, Recharts, Lucide.
- Herramientas de build: Vite, bun, tsgo.

### 4. **Mapa del sitio** (`03_mapa_sitio.md` + diagrama Mermaid)

Árbol completo de rutas (`/auth`, `/reset-password`, `/_authenticated/*`) y de **secciones internas** del shell (Dashboard, Casas, Sitios, Plano, Vale Tipo, Materiales, Recepciones, Entregas, Inventario, Reportes, Simulador, Configuración, Usuarios, Ayuda). Diagrama visual de navegación.

### 5. **Estructura de archivos del código** (`04_estructura_codigo.md`)

Árbol comentado de `src/` explicando el rol de cada carpeta:

- `routes/` — ruteo basado en archivos (TanStack).
- `sections/` — una pantalla por archivo.
- `components/` — UI reutilizable (data-table, dialogs, app-shell, etc.).
- `lib/` — queries, tipos, server functions (`.functions.ts`), server-only (`.server.ts`), cómputo (compute.ts).
- `integrations/supabase/` — clientes (browser/server/admin) y middleware de auth.
- `hooks/`, `styles.css`, `router.tsx`, `start.ts`, `server.ts`.

### 6. **Documentación de cada sección** (`05_secciones/*.md`, una por sección)

Por cada una de las ~14 secciones:

- Para qué sirve (lenguaje normal).
- Datos que muestra y de dónde salen (qué tablas/vistas).
- Acciones disponibles (crear, editar, borrar, exportar PDF/Excel).
- KPIs y estadísticas que calcula y la **fórmula exacta** (ej.: `pendiente = necesario − recepcionado`, `faltante = max(0, necesario − stock)`).
- Reglas de negocio (búsqueda por tokens, formato guía `G-####`/`F-####`, paginación 10, etc.).
- Captura/descripción de la UI.

### 7. **Base de datos** (`06_base_datos.md` + diagrama ER Mermaid)

- Listado de las 20 tablas existentes (`sites`, `vale_types_v2`, `vale_stages`, `materials_v2`, `vale_reqs`, `site_deliveries`, `site_delivery_items`, `receptions`, `house_types`, `house_material_req`, `deliveries`, `delivery_items`, `delivery_houses`, `house_exec_overrides`, `inventory_counts`, `inventory_adjustments`, `project_config`, `profiles`, `user_roles`, `deletion_log`).
- Para cada tabla: columnas con tipo, qué guarda en lenguaje normal, claves foráneas, índices.
- Vistas/agregados (`v_required`, `v_received`, `v_delivered`, `v_stock`, `v_houses_executed`).
- Funciones SQL (`has_role`, `is_approved`, `handle_new_profile`, `protect_superadmin`, `touch_updated_at`).
- Diagrama entidad-relación.

### 8. **Seguridad** (`07_seguridad.md`)

- **Autenticación**: Lovable Cloud (Supabase Auth) con email/password + Google; flujo de aprobación de usuarios (`profiles.status`), superadmin protegido por correo fijo.
- **Autorización**: tabla `user_roles` + enum `app_role` + función `has_role` (SECURITY DEFINER) para evitar recursión en RLS.
- **RLS (Row Level Security)**: estado de cada tabla, política aplicada, qué rol puede leer/escribir.
- **GRANTs** del esquema público.
- **Contraseña de obra** (`EDIT_PASSPHRASE`) para operaciones admin vía `adminMutateFn`.
- **Historial/Auditoría**: `deletion_log` registra insert/update/delete/cascade con diff.
- **Secretos** en variables de entorno (nunca en el cliente).
- **Hardening pendiente** (lo ya detectado en `mem://pending/improvements`).

### 9. **API interna y conexiones** (`08_api_y_conexiones.md`)

- Server functions (`createServerFn`) catalogadas: nombre, método, input (Zod), output, qué hace, quién la llama. Ej.: `adminMutateFn`, `cascadeDeleteFn`, `listHistoryFn`, `backupFn`, `materialReplaceFn`.
- Rutas API públicas (si las hay).
- Middleware (`attachSupabaseAuth`, `requireSupabaseAuth`, `errorMiddleware`).
- Flujo cliente → server function → Supabase (diagrama de secuencia).
- Variables de entorno (públicas `VITE_*` vs server-only).

### 10. **Cómputo y reglas de negocio** (`09_compute.md`)

Detalle de `src/lib/compute.ts`, `sites-compute.ts`, `plano-compute.ts`, `unit-conversion.ts`: fórmulas, estados de celda (complete/partial/empty/na), agregaciones para el Simulador.

### 11. **Flujos de usuario** (`10_flujos.md` + diagramas)

Diagramas paso a paso de:

- Recepción de material (con validación de guía).
- Entrega a sitio (manual y auto desde vale).
- Conteo de inventario y ajuste.
- Simulador (escenario hipotético → PDF/Excel).
- Cascade delete con confirmación + registro en historial.

### 12. **Build, deploy y operación** (`11_devops.md`)

Cómo se construye (`bun install`, Vite build), cómo se despliega (Lovable → Cloudflare Workers), migraciones de base (gestionadas por Lovable Cloud), backups (CSV por tabla), logs.

### 13. **Apéndices**

- A. Listado completo de dependencias (`package.json` comentado).
- B. Convenciones de código (Prettier, ESLint, TS strict).
- C. Glosario técnico.
- D. Mejoras pendientes / deuda técnica.

---

## Formato de entrega

- Todos los `.md` en `/mnt/documents/dossier/`.
- Un PDF consolidado `dossier_completo.pdf` (con índice y portada) para imprimir/enviar.
- Diagramas Mermaid (`.mmd`) renderizables: mapa del sitio, ER de base de datos, secuencia de auth, flujo de simulador.
- Un `dossier.zip` con todo junto.

---

## Cómo lo voy a construir (parte técnica, para ti)

1. Inspección automática del repositorio: leer `package.json`, `src/routes/**`, `src/sections/**`, `src/lib/**`, `src/components/app-shell.tsx`, `src/integrations/supabase/types.ts`.
2. Consultar Supabase (read-only) para obtener columnas, RLS, políticas y GRANTs reales (no inventados).
3. Generar Markdown sección por sección.
4. Renderizar el PDF consolidado con un script de Node usando los estilos del proyecto (tipografía Boutique Café) para que se vea coherente.
5. Empaquetar todo en ZIP.

---

## Lo que NO incluye (para que no haya sorpresas)

- No expongo claves privadas, service role, ni contraseñas reales (sí menciono dónde están guardadas).
- No modifico nada del sitio ni de la base de datos: es 100% documentación.
- No reemplaza la asesoría legal sobre datos personales — sólo describe lo técnico.

---

¿Quieres que avance así, o prefieres que el dossier sea más corto (solo PDF ejecutivo + diagramas) o más extenso (incluyendo screenshots de cada pantalla)? MUY EXTENSO