import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ⚠️ TEMPORAL: respaldo acotado a entregas, materiales y recepciones.
// Cuando el sistema migre a "vales por casa", retirar respaldo/restauración.
// Orden seguro para restaurar (padres primero, hijos después por las FKs).
export const BACKUP_TABLES = [
  "materials",
  "receptions",
  "deliveries",
  "delivery_items",
  "delivery_houses",
] as const;

const restoreSchema = z.object({
  passphrase: z.string().min(1),
  payload: z.record(z.string(), z.array(z.record(z.string(), z.any()))),
});

export const restoreBackupFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => restoreSchema.parse(input))
  .handler(async ({ data }) => {
    const { checkPassphrase } = await import("./admin.server");
    checkPassphrase(data.passphrase);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Borrar en orden inverso (hijos primero) para no violar FKs.
    const reverse = [...BACKUP_TABLES].reverse();
    for (const t of reverse) {
      const { error } = await supabaseAdmin
        .from(t)
        .delete()
        .not("id", "is", null);
      if (error) throw new Error(`Borrando ${t}: ${error.message}`);
    }

    // Insertar en orden normal (padres primero).
    for (const t of BACKUP_TABLES) {
      const rows = data.payload[t];
      if (!rows || rows.length === 0) continue;
      const { error } = await supabaseAdmin.from(t).insert(rows as any);
      if (error) throw new Error(`Restaurando ${t}: ${error.message}`);
    }

    return { ok: true, tables: BACKUP_TABLES.length };
  });
