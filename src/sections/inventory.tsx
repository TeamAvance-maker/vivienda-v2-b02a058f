import { useMemo, useState } from "react";
import { CheckCircle2, Pencil, ShieldCheck, Trash2 } from "lucide-react";
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
import { EditDialog } from "@/components/edit-dialog";
import { requestAdminMutation } from "@/components/passphrase-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdjustments,
  useInventory,
  useInvalidateAll,
  useVStock,
} from "@/lib/queries";
import { useMaterialsV2 } from "@/lib/sites-queries";
import type { Handedness, InventoryCount } from "@/lib/types";
import { HAND_LABEL } from "@/lib/types";
import { fmtDate, fmtNumber, get, makeMap } from "@/lib/compute";
import { cn } from "@/lib/utils";

export function InventorySection() {
  const list = useInventory();
  const adjustments = useAdjustments();
  const materials = useMaterialsV2();
  const stock = useVStock();
  const invalidate = useInvalidateAll();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    material_code: "",
    handedness: "none" as Handedness,
    counted_qty: 0,
    note: "",
  });
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<InventoryCount | null>(null);

  const mat = materials.data?.find((m) => m.code === form.material_code);
  const handOpts: Handedness[] = mat?.tracks_handedness ? ["left", "right"] : ["none"];

  // Búsqueda en el selector
  const [matFilter, setMatFilter] = useState("");
  const matOptions = useMemo(() => {
    const f = matFilter.trim().toLowerCase();
    const all = materials.data ?? [];
    return f
      ? all.filter(
          (m) =>
            m.description.toLowerCase().includes(f) ||
            m.code.toLowerCase().includes(f),
        )
      : all;
  }, [materials.data, matFilter]);

  async function add() {
    if (!form.material_code) return toast.error("Selecciona material");
    if (form.counted_qty < 0) return toast.error("Cantidad inválida");
    const handed = handOpts.includes(form.handedness) ? form.handedness : handOpts[0];
    const { error } = await supabase.from("inventory_counts" as never).insert({
      ...form,
      handedness: handed,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Conteo registrado");
    setForm({ ...form, counted_qty: 0, note: "" });
    invalidate();
  }

  const sm = makeMap(stock.data);
  const matMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of materials.data ?? []) m.set(x.code, x.description);
    return m;
  }, [materials.data]);

  const rows = useMemo(() => {
    const all = list.data ?? [];
    const f = filter.trim().toLowerCase();
    if (!f) return all;
    return all.filter((r) => {
      const desc = (matMap.get(r.material_code) ?? "").toLowerCase();
      return (
        r.material_code.toLowerCase().includes(f) ||
        desc.includes(f) ||
        (r.note ?? "").toLowerCase().includes(f)
      );
    });
  }, [list.data, filter, matMap]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Inventario físico"
        description="Registra lo que cuentas en bodega. El sistema te muestra la diferencia con respecto al stock teórico."
      />

      <div className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Nuevo conteo</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
                <div className="p-2">
                  <Input
                    autoFocus
                    placeholder="Buscar material…"
                    value={matFilter}
                    onChange={(e) => setMatFilter(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                {matOptions.map((m) => (
                  <SelectItem key={m.code} value={m.code}>{m.code} · {m.description}</SelectItem>
                ))}
                {matOptions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                )}
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
            <Label>Cantidad contada</Label>
            <Input
              type="number"
              min={0}
              value={form.counted_qty}
              onChange={(e) => setForm({ ...form, counted_qty: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-1">
            <Label>Nota</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add}>Registrar conteo</Button>
        </div>
      </div>

      <div className="surface-card p-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por material, código o nota…"
        />
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Material</th>
              <th className="px-4 py-2.5">Sentido</th>
              <th className="px-4 py-2.5 text-right">Sistema</th>
              <th className="px-4 py-2.5 text-right">Contado</th>
              <th className="px-4 py-2.5 text-right">Diferencia</th>
              <th className="px-4 py-2.5">Nota</th>
              <th className="px-4 py-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sys = get(sm, r.material_code, r.handedness);
              const diff = r.counted_qty - sys;
              const desc = matMap.get(r.material_code);
              return (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="px-4 py-2.5">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs">{r.material_code}</span>
                    {desc && <span className="ml-2 text-muted-foreground">{desc}</span>}
                  </td>
                  <td className="px-4 py-2.5">{HAND_LABEL[r.handedness]}</td>
                  <td className="px-4 py-2.5 text-right num-display">{fmtNumber(sys)}</td>
                  <td className="px-4 py-2.5 text-right num-display">{fmtNumber(r.counted_qty)}</td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right num-display",
                      diff !== 0 && (diff < 0 ? "text-destructive" : "text-[oklch(0.4_0.08_115)]"),
                    )}
                  >
                    {diff > 0 ? "+" : ""}
                    {fmtNumber(diff)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.note || "—"}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {r.adjustment_applied ? (
                      <span className="chip" title="Este conteo ya generó un ajuste de stock">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ajustado
                      </span>
                    ) : (
                      <>
                        {diff !== 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-1"
                            title="Aplicar ajuste al stock teórico"
                            onClick={() =>
                              requestAdminMutation({
                                table: "inventory_adjustments",
                                action: "insert",
                                values: {
                                  count_id: r.id,
                                  date: r.date,
                                  material_code: r.material_code,
                                  handedness: r.handedness,
                                  prev_system_qty: sys,
                                  counted_qty: r.counted_qty,
                                  delta: diff,
                                  note: r.note || null,
                                },
                                description: `Aplicar ajuste de stock para ${r.material_code} (${HAND_LABEL[r.handedness]}): el sistema dice ${fmtNumber(sys)} y contaste ${fmtNumber(r.counted_qty)}. Se registrará un ajuste de ${diff > 0 ? "+" : ""}${fmtNumber(diff)}. No se puede deshacer.`,
                                onSuccess: () => {
                                  // Marcar el conteo como ajustado
                                  supabase
                                    .from("inventory_counts" as never)
                                    .update({ adjustment_applied: true } as any)
                                    .eq("id", r.id)
                                    .then(() => invalidate());
                                },
                              })
                            }
                          >
                            <ShieldCheck className="mr-1 h-4 w-4" />
                            Aplicar ajuste
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setEditing(r)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          onClick={() =>
                            requestAdminMutation({
                              table: "inventory_counts",
                              action: "delete",
                              match: { id: r.id },
                              description: `Eliminar conteo del ${fmtDate(r.date)} · ${r.material_code} · ${fmtNumber(r.counted_qty)}.`,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  {(list.data ?? []).length === 0 ? "Sin conteos registrados." : "Sin resultados para ese filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (() => {
        const em = materials.data?.find((x) => x.code === editing.material_code);
        const tracks = !!em?.tracks_handedness;
        return (
        <EditDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title="Editar conteo"
          description={`${editing.material_code} · ${fmtDate(editing.date)}`}
          table="inventory_counts"
          match={{ id: editing.id }}
          fields={[
            { name: "date", label: "Fecha", type: "date" },
            { name: "counted_qty", label: "Cantidad contada", type: "number" },
            ...(tracks
              ? [{
                  name: "handedness",
                  label: "Sentido",
                  type: "select" as const,
                  options: [
                    { value: "left", label: HAND_LABEL.left },
                    { value: "right", label: HAND_LABEL.right },
                  ],
                }]
              : []),
            { name: "note", label: "Nota", type: "text" as const },
          ]}
          initial={{
            date: editing.date,
            counted_qty: editing.counted_qty,
            handedness: editing.handedness,
            note: editing.note ?? "",
          }}
        />
      );})()}
    </div>
  );
}
