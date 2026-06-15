import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { EditDialog } from "@/components/edit-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionHeader } from "@/components/app-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { requestAdminMutation } from "@/components/passphrase-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  useDeliveries,
  useDeliveryHouses,
  useDeliveryItems,
  useHouseTypes,
  useInvalidateAll,
  useMaterials,
  useReqs,
  useVStock,
} from "@/lib/queries";
import {
  useSites,
  useValeTypes,
  useValeStages,
  useValeReqs,
  useMaterialsV2,
  useSiteDeliveries,
  useSiteDeliveryItems,
} from "@/lib/sites-queries";
import { SiteValeDialog } from "@/sections/sites";
import { buildMaps, cellStatus } from "@/lib/sites-compute";
import type { Site, ValeTypeV2 } from "@/lib/sites-types";
import type { Handedness } from "@/lib/types";
import { HAND_LABEL } from "@/lib/types";
import { fmtDate, fmtNumber, get, makeMap } from "@/lib/compute";
import { cn } from "@/lib/utils";


type ManualLine = { material_code: string; handedness: Handedness; qty: number };

export function DeliveriesSection() {
  const today = new Date().toISOString().slice(0, 10);
  const deliveries = useDeliveries();
  const items = useDeliveryItems();
  const dh = useDeliveryHouses();
  const materials = useMaterials();
  const types = useHouseTypes();
  const reqs = useReqs();
  const stock = useVStock();
  const invalidate = useInvalidateAll();

  // Manual mode state
  const [manualDate, setManualDate] = useState(today);
  const [manualNote, setManualNote] = useState("");
  const [manualLines, setManualLines] = useState<ManualLine[]>([]);
  const [manualForm, setManualForm] = useState<ManualLine>({
    material_code: "",
    handedness: "none",
    qty: 1,
  });

  const mat = materials.data?.find((m) => m.code === manualForm.material_code);
  const handOpts: Handedness[] = mat?.tracks_handedness ? ["left", "right"] : ["none"];

  function addManualLine() {
    if (!manualForm.material_code) return toast.error("Selecciona material");
    if (!manualForm.qty || manualForm.qty <= 0) return toast.error("Cantidad inválida");
    setManualLines((l) => [...l, { ...manualForm, handedness: handOpts.includes(manualForm.handedness) ? manualForm.handedness : handOpts[0] }]);
    setManualForm({ material_code: "", handedness: "none", qty: 1 });
  }

  async function saveManual() {
    if (manualLines.length === 0) return toast.error("Agrega al menos un ítem");
    // valida stock
    const sm = makeMap(stock.data);
    for (const l of manualLines) {
      if (get(sm, l.material_code, l.handedness) < l.qty) {
        return toast.error(`Stock insuficiente de ${l.material_code} ${HAND_LABEL[l.handedness]}`);
      }
    }
    const { data: del, error } = await supabase
      .from("deliveries" as never)
      .insert({ date: manualDate, mode: "manual", note: manualNote } as any)
      .select("id")
      .single();
    if (error || !del) return toast.error(error?.message ?? "Error");
    const { error: e2 } = await supabase.from("delivery_items" as never).insert(
      manualLines.map((l) => ({
        delivery_id: (del as any).id,
        material_code: l.material_code,
        handedness: l.handedness,
        qty: l.qty,
      })) as any,
    );
    if (e2) return toast.error(e2.message);
    toast.success("Entrega registrada");
    setManualLines([]);
    setManualNote("");
    invalidate();
  }

  // By-house mode state
  const [byhDate, setByhDate] = useState(today);
  const [byhNote, setByhNote] = useState("");
  const [byhRows, setByhRows] = useState<{ house_type_code: string; qty: number }[]>([]);
  const [byhForm, setByhForm] = useState({ house_type_code: "", qty: 1 });
  const [previewOpen, setPreviewOpen] = useState(false);

  function addByhRow() {
    if (!byhForm.house_type_code) return toast.error("Selecciona tipo");
    if (!byhForm.qty || byhForm.qty <= 0) return toast.error("Cantidad inválida");
    setByhRows((rs) => [...rs, byhForm]);
    setByhForm({ house_type_code: "", qty: 1 });
  }

  const derivedItems = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of byhRows) {
      const rs = (reqs.data ?? []).filter((r) => r.house_type_code === row.house_type_code);
      for (const r of rs) {
        const k = `${r.material_code}__${r.handedness}`;
        map.set(k, (map.get(k) ?? 0) + r.qty * row.qty);
      }
    }
    return [...map.entries()].map(([k, qty]) => {
      const [material_code, handedness] = k.split("__") as [string, Handedness];
      return { material_code, handedness, qty };
    });
  }, [byhRows, reqs.data]);

  const stockMap = makeMap(stock.data);
  const stockIssues = derivedItems.filter((d) => get(stockMap, d.material_code, d.handedness) < d.qty);

  async function confirmByh() {
    setPreviewOpen(false);
    const { data: del, error } = await supabase
      .from("deliveries" as never)
      .insert({ date: byhDate, mode: "by_house", note: byhNote } as any)
      .select("id")
      .single();
    if (error || !del) return toast.error(error?.message ?? "Error");
    const id = (del as any).id;
    const e1 = (
      await supabase.from("delivery_houses" as never).insert(
        byhRows.map((r) => ({ delivery_id: id, ...r })) as any,
      )
    ).error;
    if (e1) return toast.error(e1.message);
    const e2 = (
      await supabase.from("delivery_items" as never).insert(
        derivedItems.map((d) => ({ delivery_id: id, ...d })) as any,
      )
    ).error;
    if (e2) return toast.error(e2.message);
    toast.success("Entrega por viviendas registrada");
    setByhRows([]);
    setByhNote("");
    invalidate();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Entregas a terreno"
        description="Descarga material de bodega: por unidades sueltas o por viviendas completas. Las viviendas entregadas se marcan como ejecutadas."
      />

      <div className="surface-card p-2 md:p-3">
        <Tabs defaultValue="byhouse">
          <TabsList className="w-full">
            <TabsTrigger value="byhouse" className="flex-1">Por viviendas</TabsTrigger>
            <TabsTrigger value="byvale" className="flex-1">Por vale / sitio</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="byvale" className="p-3">
            <ByValeTab />
          </TabsContent>


          <TabsContent value="byhouse" className="space-y-4 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={byhDate} onChange={(e) => setByhDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Nota</Label>
                <Input value={byhNote} onChange={(e) => setByhNote(e.target.value)} placeholder="Detalle opcional" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Tipo de vivienda</Label>
                <Select
                  value={byhForm.house_type_code}
                  onValueChange={(v) => setByhForm({ ...byhForm, house_type_code: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {(types.data ?? []).map((t) => (
                      <SelectItem key={t.code} value={t.code}>{t.code} · {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={byhForm.qty}
                  onChange={(e) => setByhForm({ ...byhForm, qty: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addByhRow} className="w-full"><Plus className="mr-1 h-4 w-4" />Agregar</Button>
              </div>
            </div>

            {byhRows.length > 0 && (
              <div className="rounded-lg border border-border bg-background/60 p-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Viviendas en esta entrega
                </div>
                <div className="flex flex-wrap gap-2">
                  {byhRows.map((r, i) => (
                    <span key={i} className="chip">
                      {r.qty} × {r.house_type_code}
                      <button
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        onClick={() => setByhRows((rs) => rs.filter((_, j) => j !== i))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button disabled={byhRows.length === 0} onClick={() => setPreviewOpen(true)}>
                Revisar y confirmar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Nota</Label>
                <Input value={manualNote} onChange={(e) => setManualNote(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <Label>Material</Label>
                <Select
                  value={manualForm.material_code}
                  onValueChange={(v) => {
                    const m = materials.data?.find((x) => x.code === v);
                    setManualForm({ ...manualForm, material_code: v, handedness: m?.tracks_handedness ? "left" : "none" });
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
                  value={manualForm.handedness}
                  onValueChange={(v) => setManualForm({ ...manualForm, handedness: v as Handedness })}
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
                  value={manualForm.qty}
                  onChange={(e) => setManualForm({ ...manualForm, qty: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addManualLine} className="w-full"><Plus className="mr-1 h-4 w-4" />Añadir</Button>
              </div>
            </div>

            {manualLines.length > 0 && (
              <div className="rounded-lg border border-border bg-background/60 p-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Ítems</div>
                <ul className="space-y-1 text-sm">
                  {manualLines.map((l, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>
                        {l.qty} × <b>{l.material_code}</b> ({HAND_LABEL[l.handedness]})
                      </span>
                      <button
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setManualLines((ls) => ls.filter((_, j) => j !== i))}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button disabled={manualLines.length === 0} onClick={saveManual}>
                Guardar entrega manual
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Listado de entregas */}
      <div className="surface-card overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3 font-display text-base font-semibold">
          Historial de entregas
        </div>
        <div className="divide-y divide-border/50">
          {(deliveries.data ?? []).map((d) => {
            const its = (items.data ?? []).filter((x) => x.delivery_id === d.id);
            const hs = (dh.data ?? []).filter((x) => x.delivery_id === d.id);
            return (
              <DeliveryRow
                key={d.id}
                d={d}
                items={its}
                houses={hs}
                materials={materials.data ?? []}
                houseTypes={types.data ?? []}
              />
            );
          })}
          {(deliveries.data ?? []).length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              Aún no hay entregas registradas.
            </div>
          )}
        </div>
      </div>

      {/* Preview dialog */}
      <AlertDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar entrega por viviendas</AlertDialogTitle>
            <AlertDialogDescription>
              Se descontará el siguiente material del stock y las viviendas se marcarán como ejecutadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-72 space-y-1 overflow-auto rounded-lg border border-border bg-background/60 p-3 text-sm">
            {derivedItems.map((d) => {
              const issue = get(stockMap, d.material_code, d.handedness) < d.qty;
              return (
                <div
                  key={`${d.material_code}-${d.handedness}`}
                  className={cn("flex items-center justify-between", issue && "text-destructive")}
                >
                  <span>{d.material_code} · {HAND_LABEL[d.handedness]}</span>
                  <span className="num-display">
                    {fmtNumber(d.qty)}{" "}
                    <span className="text-xs text-muted-foreground">
                      (stock: {fmtNumber(get(stockMap, d.material_code, d.handedness))})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {stockIssues.length > 0 && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Hay {stockIssues.length} material(es) con stock insuficiente. Aun así puedes confirmar; el saldo quedará negativo.
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmByh}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DeliveryRow({
  d,
  items,
  houses,
  materials,
  houseTypes,
}: {
  d: any;
  items: any[];
  houses: any[];
  materials: any[];
  houseTypes: any[];
}) {
  const [open, setOpen] = useState(false);
  const [editHeader, setEditHeader] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editHouse, setEditHouse] = useState<any | null>(null);
  return (
    <div className="px-4 py-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <div className="text-sm font-medium">
            {fmtDate(d.date)} · {d.mode === "by_house" ? "Por viviendas" : "Manual"}
          </div>
          <div className="text-xs text-muted-foreground">{d.note || "Sin nota"}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="chip">{items.length} ítems</span>
          {d.mode === "by_house" && (
            <span className="chip">{houses.reduce((a, b) => a + b.qty, 0)} viviendas</span>
          )}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-background/60 p-3 text-sm">
          {houses.length > 0 && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Viviendas</div>
              <div className="flex flex-wrap items-center gap-2">
                {houses.map((h) => (
                  <span key={h.id} className="chip">
                    {h.qty} × {h.house_type_code}
                    <button
                      className="ml-1 text-muted-foreground hover:text-primary"
                      onClick={() => setEditHouse(h)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Ítems descontados</div>
            <ul className="space-y-1">
              {items.map((it) => {
                const m = materials.find((x) => x.code === it.material_code);
                return (
                  <li key={it.id} className="flex items-center justify-between">
                    <span>{it.material_code} · {HAND_LABEL[it.handedness as Handedness]} <span className="text-xs text-muted-foreground">{m?.description}</span></span>
                    <span className="flex items-center gap-2">
                      <span className="num-display">{it.qty}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(it)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditHeader(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              Editar fecha/nota
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                requestAdminMutation({
                  table: "deliveries",
                  action: "delete",
                  match: { id: d.id },
                  description: `Eliminar entrega del ${fmtDate(d.date)}. Devolverá el material al stock y revertirá las viviendas ejecutadas.`,
                })
              }
            >
              <Trash2 className="mr-1 h-4 w-4 text-destructive" />
              Eliminar entrega
            </Button>
          </div>
        </div>
      )}

      {editHeader && (
        <EditDialog
          open={editHeader}
          onOpenChange={setEditHeader}
          title="Editar entrega"
          description={`Entrega del ${fmtDate(d.date)}`}
          table="deliveries"
          match={{ id: d.id }}
          initial={{ date: d.date, note: d.note ?? "" }}
          fields={[
            { name: "date", label: "Fecha", type: "date" },
            { name: "note", label: "Nota", type: "text" },
          ]}
        />
      )}

      {editItem && (
        <EditDialog
          open={!!editItem}
          onOpenChange={(o) => !o && setEditItem(null)}
          title="Editar ítem"
          description={`${editItem.material_code} · ${HAND_LABEL[editItem.handedness as Handedness]}`}
          table="delivery_items"
          match={{ id: editItem.id }}
          initial={{ qty: editItem.qty }}
          fields={[{ name: "qty", label: "Cantidad", type: "number" }]}
        />
      )}

      {editHouse && (
        <EditDialog
          open={!!editHouse}
          onOpenChange={(o) => !o && setEditHouse(null)}
          title="Editar viviendas"
          description={`Tipo ${editHouse.house_type_code}`}
          table="delivery_houses"
          match={{ id: editHouse.id }}
          initial={{ qty: editHouse.qty }}
          fields={[{ name: "qty", label: "Cantidad", type: "number" }]}
        />
      )}
    </div>
  );
}
