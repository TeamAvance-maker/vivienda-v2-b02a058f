import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import {
  useInventory,
  useInvalidateAll,
  useMaterials,
  useVStock,
} from "@/lib/queries";
import type { Handedness } from "@/lib/types";
import { HAND_LABEL } from "@/lib/types";
import { fmtDate, fmtNumber, get, makeMap } from "@/lib/compute";
import { cn } from "@/lib/utils";

export function InventorySection() {
  const list = useInventory();
  const materials = useMaterials();
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

  const mat = materials.data?.find((m) => m.code === form.material_code);
  const handOpts: Handedness[] = mat?.tracks_handedness ? ["left", "right"] : ["none"];

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
                {(materials.data ?? []).map((m) => (
                  <SelectItem key={m.code} value={m.code}>{m.code} · {m.description}</SelectItem>
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

      <div className="surface-card overflow-hidden">
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
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((r) => {
              const sys = get(sm, r.material_code, r.handedness);
              const diff = r.counted_qty - sys;
              return (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="px-4 py-2.5">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5">{r.material_code}</td>
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
                </tr>
              );
            })}
            {(list.data ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Sin conteos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
