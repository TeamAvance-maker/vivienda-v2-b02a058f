import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Validador de payload genérico para mutaciones administrativas.
const tableEnum = z.enum([
  "project_config",
  "house_types",
  "materials",
  "house_material_req",
  "receptions",
  "deliveries",
  "delivery_items",
  "delivery_houses",
  "house_exec_overrides",
  "inventory_counts",
  "inventory_adjustments",
  "materials_v2",
  "vale_types_v2",
  "vale_stages",
  "vale_reqs",
  "sites",
  "site_deliveries",
  "site_delivery_items",
]);

const mutationSchema = z.object({
  passphrase: z.string().min(1),
  table: tableEnum,
  action: z.enum(["update", "delete", "insert"]),
  match: z.record(z.string(), z.any()).optional(),
  values: z.record(z.string(), z.any()).optional(),
});

export const verifyPassphraseFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ passphrase: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { checkPassphrase } = await import("./admin.server");
    checkPassphrase(data.passphrase);
    return { ok: true };
  });

export const adminMutateFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => mutationSchema.parse(input))
  .handler(async ({ data }) => {
    const { checkPassphrase } = await import("./admin.server");
    checkPassphrase(data.passphrase);

    // Reglas inmutables:
    // - inventory_adjustments es historial: solo permite INSERT.
    if (data.table === "inventory_adjustments" && data.action !== "insert") {
      throw new Error("Los ajustes de inventario no se pueden modificar ni eliminar.");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Bloquear edición/eliminación de conteos que ya generaron ajuste.
    if (
      data.table === "inventory_counts" &&
      (data.action === "update" || data.action === "delete") &&
      data.match?.id
    ) {
      const { data: existing, error: chkErr } = await supabaseAdmin
        .from("inventory_counts")
        .select("adjustment_applied")
        .eq("id", data.match.id)
        .maybeSingle();
      if (chkErr) throw new Error(chkErr.message);
      if ((existing as any)?.adjustment_applied) {
        throw new Error(
          "Este conteo ya generó un ajuste y no puede modificarse ni eliminarse. Crea un nuevo conteo si necesitas corregir.",
        );
      }
    }


    if (data.action === "delete") {
      if (!data.match || Object.keys(data.match).length === 0) {
        throw new Error("Falta filtro para eliminar.");
      }
      let q: any = supabaseAdmin.from(data.table).delete();
      for (const [k, v] of Object.entries(data.match)) q = q.eq(k, v);
      const { error } = await q;
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.action === "update") {
      if (!data.match || Object.keys(data.match).length === 0) {
        throw new Error("Falta filtro para actualizar.");
      }
      if (!data.values) throw new Error("Faltan valores.");
      let q: any = supabaseAdmin.from(data.table).update(data.values as any);
      for (const [k, v] of Object.entries(data.match)) q = q.eq(k, v);
      const { error } = await q;
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // insert privilegiado
    if (!data.values) throw new Error("Faltan valores.");
    const { error } = await supabaseAdmin
      .from(data.table)
      .insert(data.values as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Reemplaza por completo los ítems de una entrega site_deliveries.
// Útil para editar cantidades entregadas en bloque con UNA sola contraseña.
const editDeliverySchema = z.object({
  passphrase: z.string().min(1),
  delivery_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        material_id: z.string().uuid(),
        qty: z.number().positive(),
      }),
    )
    .min(0),
  note: z.string().optional(),
});

export const editSiteDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => editDeliverySchema.parse(input))
  .handler(async ({ data }) => {
    const { checkPassphrase } = await import("./admin.server");
    checkPassphrase(data.passphrase);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { error: delErr } = await supabaseAdmin
      .from("site_delivery_items")
      .delete()
      .eq("delivery_id", data.delivery_id);
    if (delErr) throw new Error(delErr.message);

    if (data.items.length > 0) {
      const rows = data.items.map((it) => ({
        delivery_id: data.delivery_id,
        material_id: it.material_id,
        qty: it.qty,
      }));
      const { error: insErr } = await supabaseAdmin
        .from("site_delivery_items")
        .insert(rows as any);
      if (insErr) throw new Error(insErr.message);
    }

    if (data.note !== undefined) {
      const { error: updErr } = await supabaseAdmin
        .from("site_deliveries")
        .update({ note: data.note } as any)
        .eq("id", data.delivery_id);
      if (updErr) throw new Error(updErr.message);
    }

    return { ok: true };
  });

// Crea una entrega (site_deliveries) + sus ítems en una sola llamada con contraseña.
const createDeliverySchema = z.object({
  passphrase: z.string().min(1),
  site_id: z.string().uuid(),
  vale_stage_id: z.string().uuid(),
  mode: z.enum(["manual", "auto", "group"]),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        material_id: z.string().uuid(),
        qty: z.number().positive(),
      }),
    )
    .min(1),
});

export const createSiteDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createDeliverySchema.parse(input))
  .handler(async ({ data }) => {
    const { checkPassphrase } = await import("./admin.server");
    checkPassphrase(data.passphrase);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: deliv, error: e1 } = await supabaseAdmin
      .from("site_deliveries")
      .insert({
        site_id: data.site_id,
        vale_stage_id: data.vale_stage_id,
        mode: data.mode,
        note: data.note ?? "",
      } as any)
      .select("id")
      .single();
    if (e1 || !deliv) throw new Error(e1?.message ?? "Error al crear entrega");

    const rows = data.items.map((it) => ({
      delivery_id: (deliv as { id: string }).id,
      material_id: it.material_id,
      qty: it.qty,
    }));
    const { error: e2 } = await supabaseAdmin
      .from("site_delivery_items")
      .insert(rows as any);
    if (e2) throw new Error(e2.message);

    return { ok: true, delivery_id: (deliv as { id: string }).id, count: rows.length };
  });

// Crea una entrega grupal: misma cantidad de materiales para varios sitios
// (típicamente de la misma manzana). Genera UN site_delivery por cada site_id
// para mantener el registro separado por sitio.
const createGroupDeliverySchema = z.object({
  passphrase: z.string().min(1),
  site_ids: z.array(z.string().uuid()).min(1).max(200),
  vale_stage_id: z.string().uuid(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        material_id: z.string().uuid(),
        qty: z.number().positive(),
      }),
    )
    .min(1),
});

export const createGroupSiteDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createGroupDeliverySchema.parse(input))
  .handler(async ({ data }) => {
    const { checkPassphrase } = await import("./admin.server");
    checkPassphrase(data.passphrase);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const headers = data.site_ids.map((sid) => ({
      site_id: sid,
      vale_stage_id: data.vale_stage_id,
      mode: "group",
      note: data.note ?? "",
    }));
    const { data: delivs, error: e1 } = await supabaseAdmin
      .from("site_deliveries")
      .insert(headers as any)
      .select("id, site_id");
    if (e1 || !delivs) throw new Error(e1?.message ?? "Error al crear entregas");

    const rows = (delivs as { id: string; site_id: string }[]).flatMap((d) =>
      data.items.map((it) => ({
        delivery_id: d.id,
        material_id: it.material_id,
        qty: it.qty,
      })),
    );
    const { error: e2 } = await supabaseAdmin
      .from("site_delivery_items")
      .insert(rows as any);
    if (e2) throw new Error(e2.message);

    return { ok: true, deliveries: delivs.length, items_per_site: data.items.length };
  });


