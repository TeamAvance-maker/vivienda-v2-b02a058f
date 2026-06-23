## Qué encontré

Al revisar la base de datos de la obra, descubrí **una sola causa raíz que explica las dos cosas que ves**:

Cuando la última vez recreé las "vistas" `v_required` (Necesario) y `v_delivered` (Entregado), se me quedó pegada **una opción de seguridad que SÍ tienen las otras vistas** (`v_received`, `v_stock`, `v_houses_executed`).

Esa opción se llama `security_invoker=on`. En lenguaje simple:

- **CON la opción puesta** → la vista respeta los permisos del usuario que la consulta. El navegador del superadmin (y los amigos que apruebes) puede leerla normalmente.
- **SIN la opción puesta** → la vista se comporta como si la consultara "el dueño de la base", lo cual:
  1. Hace que el escáner de seguridad de Lovable la marque como **"Security Definer View" Critical** (el error que viste).
  2. Hace que el navegador, al pedirla, reciba los datos pero a veces como vacíos o sin que se apliquen los GRANT correctos → por eso publicaste y "no se aplicaron los cambios".

Confirmación con consulta a la base:

```text
viewname            opts
v_received          {security_invoker=on}    ✓
v_stock             {security_invoker=on}    ✓
v_houses_executed   {security_invoker=on}    ✓
v_required          (vacío)                  ✗  ← falta
v_delivered         (vacío)                  ✗  ← falta
```

Los datos en la base SÍ están bien: hay 1.593.473 unidades necesarias, 384.343 recepcionadas, 6.350 entregadas y 377.993 en stock. El cálculo es correcto, lo que falla es **el permiso para mostrarlos**.

## Qué voy a hacer

**Una sola migración pequeña** que:

1. Vuelve a crear las vistas `v_required` y `v_delivered` con la opción `security_invoker=on` (igual que las otras tres).
2. Les da los permisos de lectura a los roles que usa el sitio (`anon`, `authenticated`, `service_role`).
3. No cambia ninguna fórmula. Las cuentas siguen siendo:
   - **Necesario** = cantidad por vale × número de sitios de ese tipo de casa.
   - **Entregado** = suma de lo entregado en cada sitio (tabla `site_delivery_items`).

No toco código del frontend porque ya está bien (el último cambio quedó aplicado, solo no se veía por el permiso bloqueado).

## Seguridad

Esta misma migración **resuelve el hallazgo "Critical: Security Definer View"** del escáner. Después de aplicarla volveré a correr el escáner para confirmar que el aviso crítico desapareció.

El otro aviso que mencionaste — *"Signed-In Users Can Execute SECURITY DEFINER Function"* — ya está marcado como **Ignored** y es esperable: es la función `has_role` que necesita ese modo para evitar bucles infinitos al consultar roles (es el patrón recomendado por Lovable Cloud). No lo toco.

## Cómo verificarlo tú

Después de aplicar la migración:

1. Refresca la página de la obra con **F5**.
2. Anda a **Reportes → Tabla maestra**: verás los números en *Necesario*, *Pendiente comprar* y *% Cumplimiento*.
3. Si quieres publicar para tus amigos, dale al botón **Publicar** y espera ~1 minuto.

## Detalle técnico (para el registro)

```sql
DROP VIEW IF EXISTS public.v_required;
CREATE VIEW public.v_required WITH (security_invoker=on) AS
  SELECT m.code AS material_code, 'none'::handedness AS handedness,
         (SUM(vr.qty * s.cnt))::int AS qty
  FROM vale_reqs vr
  JOIN materials_v2 m ON m.id = vr.material_id
  JOIN (SELECT house_type::text AS ht, COUNT(*)::int AS cnt
        FROM sites GROUP BY house_type) s ON s.ht = vr.house_type::text
  GROUP BY m.code;
GRANT SELECT ON public.v_required TO anon, authenticated;
GRANT ALL ON public.v_required TO service_role;

DROP VIEW IF EXISTS public.v_delivered;
CREATE VIEW public.v_delivered WITH (security_invoker=on) AS
  SELECT m.code AS material_code, 'none'::handedness AS handedness,
         (SUM(sdi.qty))::int AS qty
  FROM site_delivery_items sdi
  JOIN materials_v2 m ON m.id = sdi.material_id
  GROUP BY m.code;
GRANT SELECT ON public.v_delivered TO anon, authenticated;
GRANT ALL ON public.v_delivered TO service_role;
```
