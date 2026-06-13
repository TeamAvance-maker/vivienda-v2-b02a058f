
# Plan: Documento Maestro de Continuidad

## Qué te voy a entregar

Dos archivos descargables en `/mnt/documents`:

- `continuidad-control-avance-viviendas.md` (Markdown editable)
- `continuidad-control-avance-viviendas.pdf` (PDF para compartir/imprimir)

Mismo contenido en ambos. Nombre del sistema: **Control de Avance de Viviendas**. Empresa: marcador genérico `[NOMBRE DE LA CONSTRUCTORA]` para que lo edites después.

## Qué NO voy a hacer

- No tocaré una sola línea de código de la app.
- No inventaré módulos, tablas ni pantallas que no existen.
- No propondré rediseños ni cambios de arquitectura.

## Contenido del documento (estructura final)

1. **Portada y control de versiones** — Nombre, fecha (13-jun-2026), versión 1.0, autor, propósito.
2. **Resumen ejecutivo** — Qué es, qué problema resuelve, objetivo general, objetivos específicos, beneficios.
3. **Contexto funcional del negocio**
   - Proceso de obra a alto nivel.
   - Tipos de vivienda (cargados desde tabla `house_types`, hoy normalmente A1, A2, B, C — descritos como configurables).
   - Etapas de construcción → marcado explícitamente como **PLANIFICADO** (hoy el sistema solo controla "ejecutada / incompleta / pendiente").
   - Control de materiales, stock y avance.
4. **Estado actual de la aplicación — IMPLEMENTADO**
   - URLs (preview y publicada).
   - Pantallas reales: Inicio, Recepciones, Entregas, Inventario, Tipos vivienda, Materiales, Distribución, Reportes, Configuración.
   - Dashboard: hero "Viviendas que pueden completarse", 7 KPIs (Totales, Ejecutadas, Incompletas, Pendientes, Stock, Críticos, Recepciones acumuladas), avance por tipo, tabla maestra, alertas.
   - Edición de recepciones y entregas con contraseña.
   - Respaldo y restauración temporal (solo materiales, recepciones, entregas) — marcado "pendiente de retirar".
5. **Arquitectura técnica (real)**
   - Frontend: React 19 + TanStack Start v1 + TanStack Router + TanStack Query + Tailwind v4 + shadcn/ui + framer-motion + recharts + sonner + jspdf + xlsx.
   - Backend: server functions de TanStack Start (`createServerFn`) en `src/lib/*.functions.ts`, con server-only en `*.server.ts`. Contraseña admin "TheDoors" para mutaciones privilegiadas.
   - Base de datos: Supabase (Lovable Cloud) — la referencio como "Lovable Cloud / backend del proyecto", no como Supabase, según convención.
   - Infra/despliegue: Lovable + Lovable Cloud, runtime Cloudflare Workers.
6. **Modelo de datos REAL** — Listado fiel de tablas existentes con sus columnas y RLS actual:
   - `project_config`, `house_types`, `materials`, `house_material_req`, `receptions`, `deliveries`, `delivery_items`, `delivery_houses`, `house_exec_overrides`, `inventory_counts`.
   - Vistas usadas por la app: `v_required`, `v_received`, `v_delivered`, `v_stock`, `v_houses_executed`.
   - Diagrama de relaciones en ASCII.
7. **Flujos funcionales actuales**
   - Alta de tipo de vivienda y requerimiento por material.
   - Recepción de guía → suma a stock.
   - Entrega manual vs entrega por casa (modos `manual` / `by_house`).
   - Cálculo de stock (`v_stock = recibido − entregado`) y de "viviendas posibles" (algoritmo de `housesPossible` en `src/lib/compute.ts`).
   - Definición exacta de "vivienda incompleta" (override negativo vigente).
   - Inventario físico y override manual.
   - Edición y eliminación protegidas por contraseña.
   - Respaldo / restauración JSON.
8. **FUNCIONALIDADES IMPLEMENTADAS** (lista cerrada, una a una, validadas contra el código).
9. **FUNCIONALIDADES PLANIFICADAS / FUTURAS** (lista separada y clara):
   - Migración a **vales tipo por casa** (≈150 vales tipo por casa, contienen etapas + materiales).
   - Carga total del catálogo de materiales (es muy grande).
   - Asociación de planos a vales tipo.
   - Avance de obra por vale tipo (reemplazará el cálculo actual de "viviendas posibles").
   - Detalle de casas incompletas por código de casa.
   - Retirada del respaldo/restauración temporal una vez migrado.
   - Sugerencias menores ya conversadas pero no implementadas.
10. **Requisitos de continuidad**
    - Qué está **validado por el usuario** y no debe tocarse: dashboard actual, KPIs, edición con contraseña, recepciones, entregas (ambos modos), inventario, respaldo temporal.
    - Qué está **experimental / pendiente de retirar**: módulo de respaldo (temporal hasta migrar a vales).
    - Reglas duras: no renombrar tablas existentes, no quitar la contraseña admin sin avisar, no migrar sin respaldo previo.
11. **Glosario** — Términos del negocio (vivienda ejecutada, incompleta, pendiente, vale tipo, handedness IZQ/DER, etc.).
12. **Prompt maestro de reanudación** — Bloque listo para copiar/pegar en un chat nuevo de Lovable, que resume sistema, stack, módulos vivos, pendientes y reglas de continuidad, terminando con la instrucción de no modificar lo implementado sin confirmación.

## Cómo lo voy a producir (técnico, por transparencia)

- Escribo el Markdown completo a mano.
- Genero el PDF con un script Python (reportlab) a partir del mismo contenido, con portada, índice y formato legible.
- Hago QA visual del PDF (convirtiendo páginas a imagen) antes de entregarlo, para que no salga con texto cortado ni cajitas negras.
- Te dejo ambos archivos vinculados con `<presentation-artifact>` para descarga directa.

## Una última confirmación antes de escribir

Cuando apruebes este plan, paso a modo build y genero ambos archivos en una sola tanda. ¿Procedo así?
