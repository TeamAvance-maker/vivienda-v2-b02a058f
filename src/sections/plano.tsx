import { useMemo, useState } from "react";
import { Map as MapIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  useSites,
  useValeTypes,
  useValeStages,
  useValeReqs,
  useSiteDeliveries,
  useSiteDeliveryItems,
  useMaterialsV2,
} from "@/lib/sites-queries";
import { buildMaps } from "@/lib/sites-compute";
import { PLANO_LOTS, PLANO_MANZANAS, type PlanoLot } from "@/lib/plano-layout";
import { siteProgress, manzanaSummary, STATUS_LABEL, type SiteOverallStatus } from "@/lib/plano-compute";
import type { Site } from "@/lib/sites-types";

type Filters = {
  valeTypeId: string; // "" = todos
  manzana: string;
  tipo: string;
  sitio: string;
  estado: string;
};

const STATUS_FILL: Record<SiteOverallStatus, string> = {
  terminado: "#bbf7d0",
  "en-ejecucion": "#fde68a",
  "sin-iniciar": "#f8fafc",
  bloqueado: "#fecaca",
  na: "#f1f5f9",
};

const TIPO_FILL: Record<string, string> = {
  A1: "#eaf6ff",
  A2: "#ffffff",
  B: "#fff1b8",
  C: "#ffd3e8",
};

const CELL_FILL: Record<"complete" | "partial" | "empty" | "na", string> = {
  complete: "#bbf7d0",
  partial: "#fde68a",
  empty: "#f8fafc",
  na: "#f1f5f9",
};

export function PlanoSection() {
  const sitesQ = useSites();
  const vtQ = useValeTypes();
  const stagesQ = useValeStages();
  const reqsQ = useValeReqs();
  const delivQ = useSiteDeliveries();
  const itemsQ = useSiteDeliveryItems();
  const matsQ = useMaterialsV2();

  const [filters, setFilters] = useState<Filters>({
    valeTypeId: "",
    manzana: "",
    tipo: "",
    sitio: "",
    estado: "",
  });
  const [selected, setSelected] = useState<
    | { kind: "site"; lot: PlanoLot }
    | { kind: "manzana"; id: string }
    | null
  >(null);

  const loading =
    sitesQ.isLoading ||
    vtQ.isLoading ||
    stagesQ.isLoading ||
    reqsQ.isLoading ||
    delivQ.isLoading ||
    itemsQ.isLoading ||
    matsQ.isLoading;

  const maps = useMemo(() => {
    if (!stagesQ.data || !reqsQ.data || !delivQ.data || !itemsQ.data || !matsQ.data) return null;
    return buildMaps({
      stages: stagesQ.data,
      reqs: reqsQ.data,
      deliveries: delivQ.data,
      items: itemsQ.data,
      materials: matsQ.data,
    });
  }, [stagesQ.data, reqsQ.data, delivQ.data, itemsQ.data, matsQ.data]);

  // Index sitios reales por "M-S"
  const siteByKey = useMemo(() => {
    const m = new Map<string, Site>();
    (sitesQ.data ?? []).forEach((s) => m.set(`${s.manzana}-${s.sitio}`, s));
    return m;
  }, [sitesQ.data]);

  const valeTypes = vtQ.data ?? [];

  // Calcular avance/estado para cada lote del plano
  const lotInfo = useMemo(() => {
    const out = new Map<
      string,
      { site: Site | null; pct: number; status: SiteOverallStatus; cellStatusForFilter?: "complete" | "partial" | "empty" | "na" }
    >();
    for (const lot of PLANO_LOTS) {
      const site = siteByKey.get(`${lot.manzana}-${lot.sitio}`) ?? null;
      if (!site || !maps) {
        out.set(lot.id, { site, pct: 0, status: "na" });
        continue;
      }
      const prog = siteProgress(site, valeTypes, maps);
      let cellStat: "complete" | "partial" | "empty" | "na" | undefined;
      if (filters.valeTypeId) {
        const v = prog.vales.find((x) => x.valeTypeId === filters.valeTypeId);
        cellStat = v?.status ?? "na";
      }
      out.set(lot.id, { site, pct: prog.pct, status: prog.status, cellStatusForFilter: cellStat });
    }
    return out;
  }, [siteByKey, maps, valeTypes, filters.valeTypeId]);

  // Sitios reales no dibujados
  const sitiosFueraDelPlano = useMemo(() => {
    const drawn = new Set(PLANO_LOTS.map((l) => `${l.manzana}-${l.sitio}`));
    return (sitesQ.data ?? []).filter((s) => !drawn.has(`${s.manzana}-${s.sitio}`));
  }, [sitesQ.data]);

  const isVisible = (lot: PlanoLot) => {
    if (filters.sitio && lot.sitio !== filters.sitio.trim()) return false;
    if (filters.manzana && lot.manzana !== filters.manzana) return false;
    if (filters.tipo && lot.tipo !== filters.tipo) return false;
    if (filters.estado) {
      const info = lotInfo.get(lot.id);
      if (!info || info.status !== filters.estado) return false;
    }
    return true;
  };

  const limpiar = () =>
    setFilters({ valeTypeId: "", manzana: "", tipo: "", sitio: "", estado: "" });

  // Resumen global
  const resumen = useMemo(() => {
    const progresses = PLANO_LOTS.map((l) => {
      const info = lotInfo.get(l.id);
      return { status: info?.status ?? ("na" as SiteOverallStatus), pct: info?.pct ?? 0 };
    });
    return manzanaSummary(
      progresses.map((p) => ({
        pct: p.pct,
        status: p.status,
        vales: [],
        applicable: 0,
        completos: 0,
      })),
    );
  }, [lotInfo]);

  return (
    <div className="space-y-4">
      <style>{`
        .plano-svg{display:block;width:100%;min-width:760px;height:auto;background:#fbfcfe;border:1px solid #e2e8f0;border-radius:16px}
        .plano-svg .road{fill:#f3f6fa}
        .plano-svg .mz-outline{fill:rgba(255,255,255,.14);stroke:#9ca3af;stroke-width:1;stroke-dasharray:4 4}
        .plano-svg .mz-area{cursor:pointer}
        .plano-svg .mz-area:hover .mz-outline{stroke:#2563eb;fill:rgba(37,99,235,.04)}
        .plano-svg .mz-title{font-size:7px;font-weight:900;fill:#111827;letter-spacing:.02em;pointer-events:none}
        .plano-svg .corner{fill:#9ca3af;opacity:.9}
        .plano-svg .lot{cursor:pointer}
        .plano-svg .lot rect{stroke:#000;stroke-width:1.15;rx:7;ry:7;filter:drop-shadow(0 2px 1px rgba(15,23,42,.12));transition:.15s}
        .plano-svg .lot:hover rect{stroke:#2563eb;stroke-width:2.2}
        .plano-svg .lot.is-hidden{opacity:.13;filter:grayscale(1)}
        .plano-svg .lot.is-highlight rect{stroke:#0ea5e9;stroke-width:2}
        .plano-svg .lot.is-selected rect{stroke:#1d4ed8;stroke-width:3}
        .plano-svg .num{font-size:8px;font-weight:950;fill:#000;text-anchor:middle;pointer-events:none}
        .plano-svg .tipo{font-size:5px;font-weight:800;fill:#64748b;text-anchor:middle;pointer-events:none}
        .plano-svg .small .num{font-size:7px}
        .plano-svg .small .tipo{font-size:4.5px}
      `}</style>

      <div className="flex items-center gap-2">
        <MapIcon className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Plano interactivo</h2>
          <p className="text-sm text-muted-foreground">
            Loteo conectado a vales reales. Click en sitio o manzana para ver detalle.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 md:grid-cols-6">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Vale tipo
          </label>
          <Select
            value={filters.valeTypeId || "all"}
            onValueChange={(v) => setFilters((f) => ({ ...f, valeTypeId: v === "all" ? "" : v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {valeTypes.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.code} · {v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Manzana
          </label>
          <Select
            value={filters.manzana || "all"}
            onValueChange={(v) => setFilters((f) => ({ ...f, manzana: v === "all" ? "" : v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {["1", "2", "3", "4", "5"].map((m) => (
                <SelectItem key={m} value={m}>Manzana {m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tipo casa
          </label>
          <Select
            value={filters.tipo || "all"}
            onValueChange={(v) => setFilters((f) => ({ ...f, tipo: v === "all" ? "" : v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {["A1", "A2", "B", "C"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Sitio
          </label>
          <Input
            placeholder="Ej: 55"
            value={filters.sitio}
            onChange={(e) => setFilters((f) => ({ ...f, sitio: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Estado
          </label>
          <Select
            value={filters.estado || "all"}
            onValueChange={(v) => setFilters((f) => ({ ...f, estado: v === "all" ? "" : v }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="terminado">Terminado</SelectItem>
              <SelectItem value="en-ejecucion">En ejecución</SelectItem>
              <SelectItem value="sin-iniciar">Sin iniciar</SelectItem>
              <SelectItem value="bloqueado">Detenido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={limpiar}>Limpiar</Button>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:col-span-6">
          <LegendChip color="#bbf7d0" label="Terminado" />
          <LegendChip color="#fde68a" label="En ejecución" />
          <LegendChip color="#f8fafc" label="Sin iniciar" />
          <LegendChip color="#fecaca" label="Detenido" />
          <span className="mx-2 h-3 border-l" />
          <LegendChip color="#eaf6ff" label="A1" />
          <LegendChip color="#ffffff" label="A2" />
          <LegendChip color="#fff1b8" label="B" />
          <LegendChip color="#ffd3e8" label="C" />
          {filters.valeTypeId && (
            <Badge variant="secondary">Mostrando estado de vale seleccionado</Badge>
          )}
        </div>
      </div>

      {sitiosFueraDelPlano.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ {sitiosFueraDelPlano.length} sitios reales no están dibujados en el plano.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Mapa */}
        <div className="overflow-auto rounded-2xl border bg-card p-3 shadow-sm">
          {loading && <div className="p-6 text-sm text-muted-foreground">Cargando datos…</div>}
          <svg className="plano-svg" viewBox="0 0 627 745" aria-label="Plano loteo">
            <rect className="road" x="0" y="0" width="627" height="745" rx="10" />
            <g>
              {PLANO_MANZANAS.map((m) => (
                <g
                  key={m.id}
                  className="mz-area"
                  onClick={() => setSelected({ kind: "manzana", id: m.id })}
                >
                  <rect className="mz-outline" x={m.x} y={m.y} width={m.w} height={m.h} rx={7} />
                  <text className="mz-title" x={m.labelX} y={m.labelY}>{m.title}</text>
                  <rect className="corner" x={m.x + m.w - 11} y={m.y + m.h - 10} width={9} height={9} rx={1} />
                </g>
              ))}
            </g>
            <g>
              {PLANO_LOTS.map((lot) => {
                const info = lotInfo.get(lot.id);
                let fill = TIPO_FILL[lot.tipo] ?? "#ffffff";
                if (filters.valeTypeId && info?.cellStatusForFilter) {
                  fill = CELL_FILL[info.cellStatusForFilter];
                } else if (info && info.status !== "na") {
                  fill = STATUS_FILL[info.status];
                }
                const visible = isVisible(lot);
                const isSel =
                  selected?.kind === "site" && selected.lot.id === lot.id;
                const classes = ["lot"];
                if (lot.cls) classes.push(lot.cls);
                if (!visible) classes.push("is-hidden");
                else if (
                  filters.sitio ||
                  filters.manzana ||
                  filters.tipo ||
                  filters.estado ||
                  filters.valeTypeId
                )
                  classes.push("is-highlight");
                if (isSel) classes.push("is-selected");
                return (
                  <g
                    key={lot.id}
                    className={classes.join(" ")}
                    onClick={() => setSelected({ kind: "site", lot })}
                  >
                    <rect x={lot.x} y={lot.y} width={lot.w} height={lot.h} style={{ fill }} />
                    <text className="num" x={lot.x + lot.w / 2} y={lot.y + lot.h * 0.45}>{lot.sitio}</text>
                    <text className="tipo" x={lot.x + lot.w / 2} y={lot.y + lot.h * 0.74}>{lot.tipo}</text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Resumen lateral */}
        <aside className="space-y-2 rounded-2xl border bg-card p-4 text-sm shadow-sm">
          <h3 className="font-semibold">Resumen</h3>
          <Metric label="Total sitios (plano)" value={resumen.total} />
          <Metric label="Avance promedio" value={`${resumen.avancePromedio}%`} />
          <Metric label="Terminados" value={resumen.terminados} accent="#16a34a" />
          <Metric label="En ejecución" value={resumen.enEjecucion} accent="#d97706" />
          <Metric label="Sin iniciar" value={resumen.sinIniciar} accent="#64748b" />
        </aside>
      </div>

      {/* Panel sitio */}
      <Sheet open={selected?.kind === "site"} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[420px] max-w-[95vw] overflow-y-auto sm:max-w-[420px]">
          {selected?.kind === "site" && (
            <SitePanel
              lot={selected.lot}
              site={siteByKey.get(`${selected.lot.manzana}-${selected.lot.sitio}`) ?? null}
              valeTypes={valeTypes}
              maps={maps}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Panel manzana */}
      <Sheet open={selected?.kind === "manzana"} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[420px] max-w-[95vw] overflow-y-auto sm:max-w-[420px]">
          {selected?.kind === "manzana" && (
            <ManzanaPanel id={selected.id} lotInfo={lotInfo} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
      <span
        className="inline-block h-3 w-3 rounded border"
        style={{ background: color, borderColor: "#cbd5e1" }}
      />
      {label}
    </span>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <b className="text-sm" style={accent ? { color: accent } : undefined}>{value}</b>
    </div>
  );
}

function SitePanel({
  lot,
  site,
  valeTypes,
  maps,
}: {
  lot: PlanoLot;
  site: Site | null;
  valeTypes: ReturnType<typeof useValeTypes>["data"] extends infer T ? (T extends Array<infer U> ? U : never) : never extends never
    ? import("@/lib/sites-types").ValeTypeV2[]
    : never;
  maps: ReturnType<typeof buildMaps> | null;
}) {
  if (!site || !maps) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Sitio {lot.sitio} · Manzana {lot.manzana}</SheetTitle>
          <SheetDescription>Tipo casa {lot.tipo}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Este sitio del plano no tiene datos en el sistema.
        </div>
      </>
    );
  }
  const prog = siteProgress(site, valeTypes as never, maps);
  return (
    <>
      <SheetHeader>
        <SheetTitle>Sitio {site.sitio} · Manzana {site.manzana}</SheetTitle>
        <SheetDescription>
          Tipo casa <b>{site.house_type}</b> · {STATUS_LABEL[prog.status]}
        </SheetDescription>
      </SheetHeader>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span>Avance general</span>
            <span className="font-semibold">{prog.pct}%</span>
          </div>
          <Progress value={prog.pct} />
          <div className="mt-1 text-[11px] text-muted-foreground">
            {prog.completos} de {prog.applicable} vales completos
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Vales</h4>
          <ul className="space-y-1.5">
            {prog.vales
              .filter((v) => v.status !== "na")
              .map((v) => (
                <li
                  key={v.valeTypeId}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
                >
                  <span>
                    <b>{v.code}</b> · {v.name}
                  </span>
                  <ValeStatusBadge status={v.status} />
                </li>
              ))}
            {prog.vales.filter((v) => v.status !== "na").length === 0 && (
              <li className="text-xs text-muted-foreground">No hay vales aplicables.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}

function ValeStatusBadge({ status }: { status: "complete" | "partial" | "empty" | "na" }) {
  const map = {
    complete: { label: "Completo", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    partial: { label: "Parcial", cls: "bg-amber-100 text-amber-800 border-amber-300" },
    empty: { label: "Sin entregar", cls: "bg-slate-100 text-slate-700 border-slate-300" },
    na: { label: "N/A", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  } as const;
  const v = map[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${v.cls}`}>
      {v.label}
    </span>
  );
}

function ManzanaPanel({
  id,
  lotInfo,
}: {
  id: string;
  lotInfo: Map<string, { site: Site | null; pct: number; status: SiteOverallStatus }>;
}) {
  const lots = PLANO_LOTS.filter((l) => l.manzana === id);
  const progresses = lots.map((l) => {
    const i = lotInfo.get(l.id);
    return { pct: i?.pct ?? 0, status: i?.status ?? ("na" as SiteOverallStatus) };
  });
  const sum = manzanaSummary(
    progresses.map((p) => ({
      pct: p.pct,
      status: p.status,
      vales: [],
      applicable: 0,
      completos: 0,
    })),
  );
  const tipos = lots.reduce<Record<string, number>>((acc, l) => {
    acc[l.tipo] = (acc[l.tipo] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <>
      <SheetHeader>
        <SheetTitle>Manzana {id}</SheetTitle>
        <SheetDescription>Resumen de avance y distribución</SheetDescription>
      </SheetHeader>
      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span>Avance promedio</span>
            <span className="font-semibold">{sum.avancePromedio}%</span>
          </div>
          <Progress value={sum.avancePromedio} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Metric label="Total sitios" value={sum.total} />
          <Metric label="Terminados" value={sum.terminados} accent="#16a34a" />
          <Metric label="En ejecución" value={sum.enEjecucion} accent="#d97706" />
          <Metric label="Sin iniciar" value={sum.sinIniciar} accent="#64748b" />
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Distribución por tipo</h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(tipos).map(([k, v]) => (
              <Badge key={k} variant="outline">{k}: {v}</Badge>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
