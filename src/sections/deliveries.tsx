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

      <div className="surface-card p-3 md:p-4">
        <ByValeTab />
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

// ============================================================
// Pestaña: Entrega por vale / sitio (reutiliza diálogo de Sitios)
// ============================================================
function ByValeTab() {
  const sitesQ = useSites();
  const vtQ = useValeTypes();
  const stagesQ = useValeStages();
  const reqsQ = useValeReqs();
  const matsQ = useMaterialsV2();
  const delivQ = useSiteDeliveries();
  const itemsQ = useSiteDeliveryItems();

  const [manzana, setManzana] = useState<string>("");
  const [siteId, setSiteId] = useState<string>("");
  const [valeId, setValeId] = useState<string>("");
  const [opened, setOpened] = useState<{ site: Site; vale: ValeTypeV2 } | null>(null);

  const ready =
    !sitesQ.isLoading && !vtQ.isLoading && !stagesQ.isLoading &&
    !reqsQ.isLoading && !matsQ.isLoading && !delivQ.isLoading && !itemsQ.isLoading;

  const maps = useMemo(() => {
    if (!stagesQ.data || !reqsQ.data || !delivQ.data || !itemsQ.data || !matsQ.data) return null;
    return buildMaps({
      stages: stagesQ.data, reqs: reqsQ.data,
      deliveries: delivQ.data, items: itemsQ.data, materials: matsQ.data,
    });
  }, [stagesQ.data, reqsQ.data, delivQ.data, itemsQ.data, matsQ.data]);

  const manzanas = useMemo(
    () => Array.from(new Set((sitesQ.data ?? []).map((s) => s.manzana))).sort((a, b) => a - b),
    [sitesQ.data],
  );
  const sitesOfManzana = useMemo(
    () => (sitesQ.data ?? [])
      .filter((s) => manzana && String(s.manzana) === manzana)
      .sort((a, b) => a.sitio.localeCompare(b.sitio, "es", { numeric: true })),
    [sitesQ.data, manzana],
  );
  const vales = useMemo(
    () => (vtQ.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [vtQ.data],
  );

  const selectedSite = sitesOfManzana.find((s) => s.id === siteId) ?? null;
  const selectedVale = vales.find((v) => v.id === valeId) ?? null;

  function openDialog() {
    if (!selectedSite || !selectedVale) {
      toast.error("Selecciona manzana, sitio y vale tipo");
      return;
    }
    setOpened({ site: selectedSite, vale: selectedVale });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Selecciona manzana → sitio → vale tipo y abre el panel para entregar manual o auto-completar lo que falta.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <Label>Manzana</Label>
          <SearchableSelect
            value={manzana}
            onChange={(v) => { setManzana(v); setSiteId(""); }}
            placeholder="Selecciona manzana"
            searchPlaceholder="Buscar manzana…"
            options={manzanas.map((m) => ({ value: String(m), label: `Manzana ${m}`, keywords: String(m) }))}
          />
        </div>
        <div>
          <Label>Sitio</Label>
          <SearchableSelect
            value={siteId}
            onChange={setSiteId}
            placeholder={manzana ? "Selecciona sitio" : "Primero la manzana"}
            searchPlaceholder="Buscar sitio…"
            disabled={!manzana}
            options={sitesOfManzana.map((s) => ({
              value: s.id,
              label: `Sitio ${s.sitio}`,
              hint: `Tipo ${s.house_type}`,
              keywords: `${s.sitio} ${s.house_type}`,
            }))}
          />
        </div>
        <div>
          <Label>Vale tipo</Label>
          <SearchableSelect
            value={valeId}
            onChange={setValeId}
            placeholder="Selecciona vale tipo"
            searchPlaceholder="Buscar vale…"
            options={vales.map((v) => ({
              value: v.id,
              label: v.name,
              hint: v.section,
              keywords: `${v.code} ${v.name} ${v.section}`,
            }))}
          />
        </div>
      </div>

      {selectedSite && selectedVale && maps && (
        <div className="rounded-lg border border-border bg-background/60 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="font-medium">
                Manzana {selectedSite.manzana} · Sitio {selectedSite.sitio}
                <span className="ml-2 text-xs text-muted-foreground">Tipo {selectedSite.house_type}</span>
              </div>
              <div className="text-xs text-muted-foreground">{selectedVale.name}</div>
            </div>
            <span className="chip">
              Estado: {cellStatus(selectedSite, selectedVale, maps)}
            </span>
          </div>
          <Button onClick={openDialog} className="w-full md:w-auto">
            Abrir panel de entrega
          </Button>
        </div>
      )}

      {!ready && (
        <div className="text-xs text-muted-foreground">Cargando datos…</div>
      )}

      {opened && maps && (
        <SiteValeDialog
          site={opened.site}
          vale={opened.vale}
          maps={maps}
          onClose={() => setOpened(null)}
        />
      )}
    </div>
  );
}

