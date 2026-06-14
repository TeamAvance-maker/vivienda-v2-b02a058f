import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/app-shell";
import { requestAdminMutation } from "@/components/passphrase-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateSitesV2, useMaterialsV2 } from "@/lib/sites-queries";

function nextCode(existing: { code: string }[]): string {
  let maxN = 0;
  for (const m of existing) {
    const match = /^M(\d+)$/i.exec(m.code ?? "");
    if (match) maxN = Math.max(maxN, parseInt(match[1], 10));
  }
  return `M${String(maxN + 1).padStart(4, "0")}`;
}

export function MaterialsSection() {
  const materials = useMaterialsV2();
  const invalidate = useInvalidateSitesV2();
  const [form, setForm] = useState({
    description: "",
    unit: "un",
    tracks_handedness: false,
  });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  const list = useMemo(() => {
    const all = materials.data ?? [];
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? all.filter(
          (m) =>
            m.description.toLowerCase().includes(f) ||
            m.code.toLowerCase().includes(f),
        )
      : all;
    return [...filtered].sort((a, b) =>
      a.description.localeCompare(b.description, "es"),
    );
  }, [materials.data, filter]);

  async function add() {
    if (!form.description.trim()) {
      toast.error("La descripción es requerida");
      return;
    }
    setSaving(true);
    const all = materials.data ?? [];
    const code = nextCode(all);
    const next_sort = (all.reduce((a, b) => Math.max(a, b.sort_order), 0) ?? 0) + 1;
    const { error } = await supabase.from("materials_v2" as never).insert({
      code,
      description: form.description.trim(),
      unit: form.unit.trim() || "un",
      tracks_handedness: form.tracks_handedness,
      sort_order: next_sort,
    } as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Material agregado (${code})`);
    setForm({ description: "", unit: "un", tracks_handedness: false });
    invalidate();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Materiales"
        description={`${(materials.data ?? []).length} materiales del ODS. La columna "izq/der" se marca sólo para los materiales de PUERTA. El código se genera automáticamente.`}
      />

      <div className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Agregar material</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-3">
            <Label>Descripción</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: TORNILLO 6X1 1/4"
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
            <label className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
              <Checkbox
                checked={form.tracks_handedness}
                onCheckedChange={(v) => setForm({ ...form, tracks_handedness: !!v })}
              />
              Sentido izq/der
            </label>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            El código se inventará automático (próximo: <b>{nextCode(materials.data ?? [])}</b>).
          </p>
          <Button onClick={add} disabled={saving}>
            {saving ? "Guardando…" : "Agregar material"}
          </Button>
        </div>
      </div>

      <div className="surface-card p-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por descripción o código…"
        />
      </div>

      <div className="surface-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Código</th>
              <th className="px-4 py-2.5">Descripción</th>
              <th className="px-4 py-2.5">Unidad</th>
              <th className="px-4 py-2.5">Izq/Der</th>
              <th className="px-4 py-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-t border-border/60">
                <td className="px-4 py-2.5 font-mono text-xs">{m.code}</td>
                <td className="px-4 py-2.5">{m.description}</td>
                <td className="px-4 py-2.5">{m.unit}</td>
                <td className="px-4 py-2.5">
                  {m.tracks_handedness ? (
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Sí</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      requestAdminMutation({
                        table: "materials_v2",
                        action: "delete",
                        match: { id: m.id },
                        description: `Eliminar material "${m.code} · ${m.description}". Esta acción no se puede deshacer.`,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {(materials.data ?? []).length === 0 ? "Aún no hay materiales." : "Sin resultados para ese filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
