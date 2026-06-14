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
