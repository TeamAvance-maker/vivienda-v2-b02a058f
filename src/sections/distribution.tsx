import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { useHouseTypes, useInvalidateAll, useMaterials, useReqs } from "@/lib/queries";
import type { Handedness } from "@/lib/types";
import { HAND_LABEL } from "@/lib/types";

export function DistributionSection() {
  const types = useHouseTypes();
  const materials = useMaterials();
  const reqs = useReqs();
  const invalidate = useInvalidateAll();
  const [selectedType, setSelectedType] = useState<string>("");
  const [form, setForm] = useState<{
    material_code: string;
    handedness: Handedness;
    qty: number;
  }>({ material_code: "", handedness: "none", qty: 1 });

  const activeType = selectedType || types.data?.[0]?.code || "";
  const mat = materials.data?.find((m) => m.code === form.material_code);
  const handednessOptions: Handedness[] = mat?.tracks_handedness ? ["left", "right"] : ["none"];

  const typeReqs = useMemo(
    () =>
      (reqs.data ?? []).filter((r) => r.house_type_code === activeType),
    [reqs.data, activeType],
  );

  async function addReq() {
    if (!activeType) return toast.error("Selecciona un tipo");
    if (!form.material_code) return toast.error("Selecciona un material");
    if (!form.qty || form.qty <= 0) return toast.error("Cantidad inválida");
    const handed = handednessOptions.includes(form.handedness) ? form.handedness : handednessOptions[0];
    const { error } = await supabase.from("house_material_req" as never).insert({
      house_type_code: activeType,
      material_code: form.material_code,
      handedness: handed,
      qty: form.qty,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Agregado");
    setForm({ material_code: "", handedness: "none", qty: 1 });
    invalidate();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Distribución por vivienda"
        description="Indica qué materiales (y cuántos, con qué sentido) lleva cada tipo de vivienda. El consumo total del proyecto se calcula solo."
      />

      <div className="surface-card p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Label>Tipo de vivienda</Label>
            <Select value={activeType} onValueChange={setSelectedType}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {(types.data ?? []).map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.code} · {t.name} ({t.qty} viviendas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">
          Agregar requerimiento a {activeType || "—"}
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Material</Label>
            <Select
              value={form.material_code}
              onValueChange={(v) =>
                setForm((f) => {
                  const newMat = materials.data?.find((m) => m.code === v);
                  return {
                    ...f,
                    material_code: v,
                    handedness: newMat?.tracks_handedness ? "left" : "none",
                  };
                })
              }
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
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {handednessOptions.map((h) => (
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
          <Button onClick={addReq}>Agregar</Button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5">Material</th>
              <th className="px-4 py-2.5">Sentido</th>
              <th className="px-4 py-2.5 text-right">Cant. por vivienda</th>
              <th className="px-4 py-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {typeReqs.map((r) => {
              const m = materials.data?.find((x) => x.code === r.material_code);
              return (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{r.material_code}</div>
                    <div className="text-xs text-muted-foreground">{m?.description}</div>
                  </td>
                  <td className="px-4 py-2.5">{HAND_LABEL[r.handedness]}</td>
                  <td className="px-4 py-2.5 text-right num-display">{r.qty}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        requestAdminMutation({
                          table: "house_material_req",
                          action: "delete",
                          match: { id: r.id },
                          description: `Eliminar requerimiento de ${r.material_code} en ${r.house_type_code}.`,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {typeReqs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Sin requerimientos para {activeType || "este tipo"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
