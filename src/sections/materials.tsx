import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/app-shell";
import { requestAdminMutation } from "@/components/passphrase-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMaterials, useInvalidateAll } from "@/lib/queries";

export function MaterialsSection() {
  const materials = useMaterials();
  const invalidate = useInvalidateAll();
  const [form, setForm] = useState({
    code: "",
    description: "",
    unit: "un",
    tracks_handedness: false,
  });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!form.code.trim() || !form.description.trim()) {
      toast.error("Código y descripción son requeridos");
      return;
    }
    setSaving(true);
    const next_sort =
      (materials.data?.reduce((a, b) => Math.max(a, b.sort_order), 0) ?? 0) + 1;
    const { error } = await supabase
      .from("materials" as never)
      .insert({ ...form, code: form.code.trim().toUpperCase(), sort_order: next_sort } as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Material agregado");
    setForm({ code: "", description: "", unit: "un", tracks_handedness: false });
    invalidate();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Materiales"
        description="Crea sin límite: puertas, cerraduras, cerrojos, escudos, etc. Marca «Sentido izq/der» si el material se almacena diferenciado por mano."
      />

      <div className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Agregar material</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-1">
            <Label>Código</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="P1"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Puerta Acceso"
            />
          </div>
          <div>
            <Label>Unidad</Label>
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="un"
            />
          </div>
          <div className="flex items-end">
            <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
              <Checkbox
                checked={form.tracks_handedness}
                onCheckedChange={(v) => setForm({ ...form, tracks_handedness: !!v })}
              />
              Sentido izq/der
            </label>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add} disabled={saving}>
            {saving ? "Guardando…" : "Agregar material"}
          </Button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Código</th>
              <th className="px-4 py-2.5">Descripción</th>
              <th className="px-4 py-2.5">Unidad</th>
              <th className="px-4 py-2.5">Sentido izq/der</th>
              <th className="px-4 py-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(materials.data ?? []).map((m) => (
              <tr key={m.code} className="border-t border-border/60">
                <td className="px-4 py-2.5 font-medium">{m.code}</td>
                <td className="px-4 py-2.5">{m.description}</td>
                <td className="px-4 py-2.5">{m.unit}</td>
                <td className="px-4 py-2.5">{m.tracks_handedness ? "Sí" : "No"}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      requestAdminMutation({
                        table: "materials",
                        action: "delete",
                        match: { code: m.code },
                        description: `Eliminar material "${m.code} · ${m.description}". Esta acción no se puede deshacer.`,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {(materials.data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Aún no hay materiales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
