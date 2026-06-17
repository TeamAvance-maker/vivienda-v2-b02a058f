## Resumen del problema

1. **Error RLS en Recepciones**: La tabla `receptions` solo tiene política `SELECT` para `public`. No existe política `INSERT`, y la sección `receptions.tsx` intenta insertar directamente con el cliente del navegador (anon). Las demás secciones de escritura del sistema (entregas, inventario, etc.) ya usan el patrón **server function + contraseña (passphrase) + service_role** vía `adminMutateFn`/`createSiteDeliveryFn`. Recepciones quedó fuera de ese patrón.

2. **Selects sin búsqueda**: Varios selectores nativos (`<Select>`) muestran listas largas de materiales/vales/etapas sin permitir buscar, lo que dificulta seleccionar cuando hay 100+ opciones.

3. **Menú Entregas**: Hay que revisarlo y confirmar que ambas pestañas (por vale y por grupo de casas) funcionan sin errores tras los cambios.

---

## Paso 1 — Arreglar el error de Recepciones (sin cambiar RLS)

Mantener la arquitectura existente: nunca abrir INSERT a anon. Migrar `receptions.tsx` al patrón con contraseña.

- En `src/sections/receptions.tsx`, reemplazar el `supabase.from("receptions").insert(...)` directo por una llamada a `adminMutateFn` (acción `insert`, tabla `receptions`) usando el diálogo `requestAdminMutation` que ya usan las demás secciones.
- El usuario verá el mismo diálogo de contraseña que ya conoce ("TheDoors").
- No tocar políticas RLS ni migraciones.

**Prueba**: registrar una recepción nueva en la UI y confirmar que se guarda sin el error rojo.

## Paso 2 — Añadir búsqueda a los selectores de materiales y vales

Ya existe el componente reutilizable `SearchableSelect` (usado en Entregas). Lo aplicaremos donde hay listas largas:

| Archivo | Selector afectado |
|---|---|
| `src/sections/receptions.tsx` | Material |
| `src/sections/vale-tipo.tsx` | Vale tipo, Etapa, y selector de Material al añadir requerimiento |
| `src/components/edit-dialog.tsx` | Cuando un campo `select` tenga más de ~15 opciones, usar `SearchableSelect` automáticamente (cubre edición de recepciones, entregas, requerimientos, etc. de forma transversal) |

**Se mantiene** el `<Select>` nativo en filtros cortos (tipos de casa, manzanas, sentido L/R) donde la búsqueda no aporta valor.

## Paso 3 — Verificar el menú Entregas

Tras los cambios de selects, recorrer y probar:

- **Pestaña "Por vale"**: seleccionar manzana → sitio → vale tipo → abrir panel → registrar entrega manual y auto-completar.
- **Pestaña "Por grupo de casas"**: seleccionar manzana → tipo de casa → vale → etapa → marcar varios sitios → registrar entrega en lote.
- Verificar build sin errores, console del navegador limpia y que las cantidades se guarden.

## Archivos a modificar

- `src/sections/receptions.tsx` (arreglo RLS + búsqueda en material)
- `src/sections/vale-tipo.tsx` (búsqueda en vale/etapa/material)
- `src/components/edit-dialog.tsx` (búsqueda automática en selects largos)

**No se tocará**: base de datos, políticas RLS, `admin.functions.ts`, `deliveries.tsx` (ya funciona con búsqueda), ni el resto de secciones.

## Verificación final

1. Build limpio.
2. Probar inserción de recepción real.
3. Probar las dos pestañas del menú Entregas.
4. Confirmar que los selects de materiales/vales/etapas ahora permiten escribir para filtrar.
