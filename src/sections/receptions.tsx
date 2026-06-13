import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EditDialog } from "@/components/edit-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "@/components/app-shell";
import { requestAdminMutation } from "@/components/passphrase-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateAll, useMaterials, useReceptions } from "@/lib/queries";
import type { Handedness } from "@/lib/types";
import { HAND_LABEL } from "@/lib/types";
import { fmtDate, fmtNumber } from "@/lib/compute";

export function ReceptionsSection() {
  const list = useReceptions();
  const materials = useMaterials();
  const invalidate = useInvalidateAll();
  type Row = NonNullable<typeof list.data>[number];
  const [editing, setEditing] = useState<null | Row>(null);
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    guia: "",
    material_code: "",
    handedness: "none" as Handedness,
    qty: 1,
  });
  const [search, setSearch] = useState("");

  const mat = materials.data?.find((m) => m.code === form.material_code);
  const handOpts: Handedness[] = mat?.tracks_handedness ? ["left", "right"] : ["none"];

  async function add() {
    if (!form.material_code) return toast.error("Selecciona material");
    if (!form.qty || form.qty <= 0) return toast.error("Cantidad inválida");
    const handed = handOpts.includes(form.handedness) ? form.handedness : handOpts[0];
    const { error } = await supabase.from("receptions" as never).insert({
      date: form.date,
      guia: form.guia.trim(),
      material_code: form.material_code,
      handedness: handed,
      qty: form.qty,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Recepción registrada");
    setForm({ ...form, guia: "", qty: 1 });
    invalidate();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return list.data ?? [];
    return (list.data ?? []).filter(
      (r) =>
        r.guia.toLowerCase().includes(s) ||
        r.material_code.toLowerCase().includes(s) ||
        r.date.includes(s),
    );
  }, [list.data, search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Recepciones"
        description="Registra el material que llega a obra. El stock se actualiza al instante."
      />

      <div className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Nueva recepción</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>Guía</Label>
            <Input value={form.guia} onChange={(e) => setForm({ ...form, guia: e.target.value })} placeholder="G-1234" />
          </div>
          <div className="md:col-span-2">
            <Label>Material</Label>
            <Select
              value={form.material_code}
              onValueChange={(v) => {
                const m = materials.data?.find((x) => x.code === v);
                setForm({ ...form, material_code: v, handedness: m?.tracks_handedness ? "left" : "none" });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {(materials.data ?? []).map((m) => (
                  <SelectItem key={m.code} value={m.code}>
                    {m.code} · {m.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sentido</Label>
            <Select
              value={form.handedness}
              onValueChange={(v) => setForm({ ...form, handedness: v as Handedness })}
              disabled={!mat?.tracks_handedness}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {handOpts.map((h) => (
                  <SelectItem key={h} value={h}>{HAND_LABEL[h]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={1}
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add}>Registrar recepción</Button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 p-3">
          <Input
            placeholder="Buscar por guía, material, fecha…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <span className="chip">{filtered.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Guía</th>
                <th className="px-4 py-2.5">Material</th>
                <th className="px-4 py-2.5">Sentido</th>
                <th className="px-4 py-2.5 text-right">Cantidad</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const m = materials.data?.find((x) => x.code === r.material_code);
                return (
                  <tr key={r.id} className="border-t border-border/50">
                    <td className="px-4 py-2.5">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5">{r.guia || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{r.material_code}</div>
                      <div className="text-xs text-muted-foreground">{m?.description}</div>
                    </td>
                    <td className="px-4 py-2.5">{HAND_LABEL[r.handedness]}</td>
                    <td className="px-4 py-2.5 text-right num-display">{fmtNumber(r.qty)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          requestAdminMutation({
                            table: "receptions",
                            action: "delete",
                            match: { id: r.id },
                            description: `Eliminar recepción del ${fmtDate(r.date)} · ${r.material_code} · ${r.qty} u.`,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Sin recepciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title="Editar recepción"
          description={`Recepción del ${fmtDate(editing.date)} · ${editing.material_code}`}
          table="receptions"
          match={{ id: editing.id }}
          initial={{
            date: editing.date,
            guia: editing.guia,
            material_code: editing.material_code,
            handedness: editing.handedness,
            qty: editing.qty,
          }}
          fields={[
            { name: "date", label: "Fecha", type: "date" },
            { name: "guia", label: "Guía", type: "text" },
            {
              name: "material_code",
              label: "Material",
              type: "select",
              options: (materials.data ?? []).map((m) => ({
                value: m.code,
                label: `${m.code} · ${m.description}`,
              })),
            },
            {
              name: "handedness",
              label: "Sentido",
              type: "select",
              options: (
                materials.data?.find((m) => m.code === editing.material_code)?.tracks_handedness
                  ? (["left", "right"] as Handedness[])
                  : (["none"] as Handedness[])
              ).map((h) => ({ value: h, label: HAND_LABEL[h] })),
            },
            { name: "qty", label: "Cantidad", type: "number" },
          ]}
        />
      )}
    </div>
  );
}
