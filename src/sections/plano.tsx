import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Map as MapIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, type SearchableOption } from "@/components/searchable-select";
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
import {
  siteProgress,
  manzanaSummary,
  stageCellStatus,
  valeBreakdown,
  STATUS_LABEL,
  type SiteOverallStatus,
} from "@/lib/plano-compute";
import type { CellStatus, Site, ValeStage, ValeTypeV2 } from "@/lib/sites-types";

type ValeFilter =
  | { type: "all" }
  | { type: "vale"; valeTypeId: string }
  | { type: "stage"; valeTypeId: string; stageId: string };

type Filters = {
  vale: ValeFilter;
  manzana: string;
  tipo: string;
  sitio: string;
  estado: string;
  overall: "" | SiteOverallStatus;
};

const TIPO_FILL: Record<string, string> = {
  A1: "#eaf6ff",
  A2: "#ffffff",
  B: "#fff1b8",
  C: "#ffd3e8",
};

const CELL_FILL: Record<CellStatus, string> = {
  complete: "#bbf7d0",
  partial: "#fde68a",
  empty: "#f8fafc",
  na: "#f1f5f9",
};

const STATUS_FROM_CELL: Record<CellStatus, SiteOverallStatus> = {
  complete: "terminado",
  partial: "en-ejecucion",
  empty: "sin-iniciar",
  na: "na",
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
    vale: { type: "all" },
    manzana: "",
    tipo: "",
    sitio: "",
    estado: "",
    overall: "",
  });
  const [selected, setSelected] = useState<
    { kind: "site"; lot: PlanoLot } | { kind: "manzana"; id: string } | null
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

  const siteByKey = useMemo(() => {
    const m = new Map<string, Site>();
    (sitesQ.data ?? []).forEach((s) => m.set(`${s.manzana}-${s.sitio}`, s));
    return m;
  }, [sitesQ.data]);

  const valeTypes = vtQ.data ?? [];
  const valeStages = stagesQ.data ?? [];
  const stagesByVale = useMemo(() => {
    const m = new Map<string, ValeStage[]>();
    for (const s of valeStages) {
      if (!m.has(s.vale_type_id)) m.set(s.vale_type_id, []);
      m.get(s.vale_type_id)!.push(s);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.stage_number - b.stage_number);
    return m;
  }, [valeStages]);

  const selectedValeType = useMemo(() => {
    if (filters.vale.type === "all") return null;
    const id = filters.vale.valeTypeId;
    return valeTypes.find((v) => v.id === id) ?? null;
  }, [filters.vale, valeTypes]);

  const selectedStage = useMemo(() => {
    if (filters.vale.type !== "stage") return null;
    const id = filters.vale.stageId;
    return valeStages.find((s) => s.id === id) ?? null;
  }, [filters.vale, valeStages]);

  // Info por lote
  const lotInfo = useMemo(() => {
    const out = new Map<
      string,
      { site: Site | null; pct: number; status: SiteOverallStatus; cellForFilter?: CellStatus }
    >();
    for (const lot of PLANO_LOTS) {
      const site = siteByKey.get(`${lot.manzana}-${lot.sitio}`) ?? null;
      if (!site || !maps) {
        out.set(lot.id, { site, pct: 0, status: "na" });
        continue;
      }
      const prog = siteProgress(site, valeTypes, maps);
      let cell: CellStatus | undefined;
      if (filters.vale.type === "vale" && selectedValeType) {
        const v = prog.vales.find((x) => x.valeTypeId === selectedValeType.id);
        cell = v?.status ?? "na";
      } else if (filters.vale.type === "stage" && selectedStage) {
        cell = stageCellStatus(site, selectedStage, maps);
      }
      out.set(lot.id, { site, pct: prog.pct, status: prog.status, cellForFilter: cell });
    }
    return out;
  }, [siteByKey, maps, valeTypes, filters.vale, selectedValeType, selectedStage]);

  const sitiosFueraDelPlano = useMemo(() => {
    const drawn = new Set(PLANO_LOTS.map((l) => `${l.manzana}-${l.sitio}`));
    return (sitesQ.data ?? []).filter((s) => !drawn.has(`${s.manzana}-${s.sitio}`));
  }, [sitesQ.data]);

  const hasValeFilter = filters.vale.type !== "all";

  const isVisible = (lot: PlanoLot) => {
    if (filters.sitio && lot.sitio !== filters.sitio.trim()) return false;
    if (filters.manzana && lot.manzana !== filters.manzana) return false;
    if (filters.tipo && lot.tipo !== filters.tipo) return false;
    const info = lotInfo.get(lot.id);
    if (filters.overall) {
      if (!info?.site) return false;
      if (info.status !== filters.overall) return false;
    }
    if (filters.estado && hasValeFilter) {
      const st = info?.cellForFilter ? STATUS_FROM_CELL[info.cellForFilter] : "na";
      if (st !== filters.estado) return false;
    }
    return true;
  };

  const limpiar = () =>
    setFilters({ vale: { type: "all" }, manzana: "", tipo: "", sitio: "", estado: "", overall: "" });

  // Stats globales del plano (sobre sitios reales, todos los vales)
  const stats = useMemo(() => {
    let total = 0;
    let sumPct = 0;
    let term = 0,
      exe = 0,
      sin = 0;
    let valesAppl = 0;
    let valesComp = 0;
    const porTipo: Record<string, number> = {};
    for (const lot of PLANO_LOTS) {
      const info = lotInfo.get(lot.id);
      if (!info?.site || !maps) continue;
      total++;
      porTipo[lot.tipo] = (porTipo[lot.tipo] ?? 0) + 1;
      const prog = siteProgress(info.site, valeTypes, maps);
      sumPct += prog.pct;
      valesAppl += prog.applicable;
      valesComp += prog.completos;
      if (prog.status === "terminado") term++;
      else if (prog.status === "en-ejecucion") exe++;
      else sin++;
    }
    return {
      total,
      avancePct: total === 0 ? 0 : Math.round(sumPct / total),
      term,
      exe,
      sin,
      porTipo,
      valesAppl,
      valesComp,
    };
  }, [lotInfo, maps, valeTypes]);

  // Stats del vale/etapa seleccionado
  const filterStats = useMemo(() => {
    if (!hasValeFilter) return null;
    let c = 0,
      p = 0,
      e = 0,
      na = 0;
    for (const lot of PLANO_LOTS) {
      const info = lotInfo.get(lot.id);
      const st = info?.cellForFilter ?? "na";
      if (st === "complete") c++;
      else if (st === "partial") p++;
      else if (st === "empty") e++;
      else na++;
    }
    return { c, p, e, na };
  }, [lotInfo, hasValeFilter]);

  // Valor actual del Select de vale (string serializado)
  const valeSelectValue =
    filters.vale.type === "all"
      ? "all"
      : filters.vale.type === "vale"
        ? `v:${filters.vale.valeTypeId}`
        : `s:${filters.vale.stageId}`;

  const onChangeValeSelect = (v: string) => {
    if (v === "all") setFilters((f) => ({ ...f, vale: { type: "all" }, estado: "" }));
    else if (v.startsWith("v:")) {
      const id = v.slice(2);
      setFilters((f) => ({ ...f, vale: { type: "vale", valeTypeId: id } }));
    } else if (v.startsWith("s:")) {
      const stageId = v.slice(2);
      const stage = valeStages.find((s) => s.id === stageId);
      if (stage)
        setFilters((f) => ({
          ...f,
          vale: { type: "stage", valeTypeId: stage.vale_type_id, stageId },
        }));
    }
  };

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
            Click en sitio o manzana para ver detalle. Selecciona un vale o etapa para colorear por estado.
          </p>
        </div>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Total sitios" value={stats.total} />
        <StatCard label="Avance global" value={`${stats.avancePct}%`} accent="#2563eb" />
        <StatCard
          label="Terminados"
          value={stats.term}
          accent="#16a34a"
          active={filters.overall === "terminado"}
          onClick={() =>
            setFilters((f) => ({ ...f, overall: f.overall === "terminado" ? "" : "terminado" }))
          }
        />
        <StatCard
          label="En ejecución"
          value={stats.exe}
          accent="#d97706"
          active={filters.overall === "en-ejecucion"}
          onClick={() =>
            setFilters((f) => ({
              ...f,
              overall: f.overall === "en-ejecucion" ? "" : "en-ejecucion",
            }))
          }
        />
        <StatCard
          label="Sin iniciar"
          value={stats.sin}
          accent="#64748b"
          active={filters.overall === "sin-iniciar"}
          onClick={() =>
            setFilters((f) => ({
              ...f,
              overall: f.overall === "sin-iniciar" ? "" : "sin-iniciar",
            }))
          }
        />
        <StatCard
          label="Vales completos"
          value={`${stats.valesComp}/${stats.valesAppl}`}
          accent="#0ea5e9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Distribución por tipo:</span>
        {Object.entries(stats.porTipo).map(([k, v]) => (
          <Badge key={k} variant="outline" style={{ background: TIPO_FILL[k], color: "#000", borderColor: "#0002" }}>
            {k}: {v}
          </Badge>
        ))}
        {filterStats && (
          <>
            <span className="mx-2 h-3 border-l" />
            <span className="text-muted-foreground">
              {selectedStage
                ? `Etapa "${selectedStage.name}":`
                : selectedValeType
                  ? `Vale ${selectedValeType.code}:`
                  : ""}
            </span>
            <Badge style={{ background: "#bbf7d0", color: "#000", borderColor: "#0002" }}>Completo: {filterStats.c}</Badge>
            <Badge style={{ background: "#fde68a", color: "#000", borderColor: "#0002" }}>Parcial: {filterStats.p}</Badge>
            <Badge style={{ background: "#f8fafc", color: "#000", borderColor: "#0002" }} variant="outline">
              Sin entregar: {filterStats.e}
            </Badge>
            <Badge variant="outline" style={{ color: "#000", background: "#fff", borderColor: "#0002" }}>N/A: {filterStats.na}</Badge>
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Vale tipo / Etapa
          </label>
          <Select value={valeSelectValue} onValueChange={onChangeValeSelect}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {valeTypes.map((vt) => {
                const stages = stagesByVale.get(vt.id) ?? [];
                return [
                  <SelectItem key={`v:${vt.id}`} value={`v:${vt.id}`}>
                    <b>{vt.code}</b> · {vt.name}
                  </SelectItem>,
                  ...stages.map((st) => (
                    <SelectItem key={`s:${st.id}`} value={`s:${st.id}`}>
                      &nbsp;&nbsp;&nbsp;└ E{st.stage_number} · {st.name}
                    </SelectItem>
                  )),
                ];
              })}
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {["1", "2", "3", "4", "5"].map((m) => (
                <SelectItem key={m} value={m}>
                  Manzana {m}
                </SelectItem>
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {["A1", "A2", "B", "C"].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
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
            Estado {hasValeFilter ? "" : "(elige vale)"}
          </label>
          <Select
            value={filters.estado || "all"}
            onValueChange={(v) => setFilters((f) => ({ ...f, estado: v === "all" ? "" : v }))}
            disabled={!hasValeFilter}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="terminado">Completo</SelectItem>
              <SelectItem value="en-ejecucion">Parcial</SelectItem>
              <SelectItem value="sin-iniciar">Sin entregar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-6 flex justify-end">
          <Button variant="outline" onClick={limpiar}>
            Limpiar filtros
          </Button>
        </div>
      </div>

      {sitiosFueraDelPlano.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ {sitiosFueraDelPlano.length} sitios reales no están dibujados en el plano.
        </div>
      )}

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
                <text className="mz-title" x={m.labelX} y={m.labelY}>
                  {m.title}
                </text>
                <rect
                  className="corner"
                  x={m.x + m.w - 11}
                  y={m.y + m.h - 10}
                  width={9}
                  height={9}
                  rx={1}
                />
              </g>
            ))}
          </g>
          <g>
            {PLANO_LOTS.map((lot) => {
              const info = lotInfo.get(lot.id);
              // Color por defecto = tipo de casa. Sólo si hay filtro de vale/etapa cambia.
              let fill = TIPO_FILL[lot.tipo] ?? "#ffffff";
              if (hasValeFilter && info?.cellForFilter) {
                fill = CELL_FILL[info.cellForFilter];
              }
              const visible = isVisible(lot);
              const isSel = selected?.kind === "site" && selected.lot.id === lot.id;
              const classes = ["lot"];
              if (lot.cls) classes.push(lot.cls);
              if (!visible) classes.push("is-hidden");
              else if (
                filters.sitio ||
                filters.manzana ||
                filters.tipo ||
                filters.estado ||
                hasValeFilter
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
                  <text className="num" x={lot.x + lot.w / 2} y={lot.y + lot.h * 0.45}>
                    {lot.sitio}
                  </text>
                  <text className="tipo" x={lot.x + lot.w / 2} y={lot.y + lot.h * 0.74}>
                    {lot.tipo}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Panel sitio */}
      <Sheet open={selected?.kind === "site"} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[460px] max-w-[95vw] overflow-y-auto sm:max-w-[460px]">
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
          {selected?.kind === "manzana" && <ManzanaPanel id={selected.id} lotInfo={lotInfo} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  accent?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border bg-card p-3 shadow-sm transition ${
        clickable ? "cursor-pointer hover:bg-muted/40" : ""
      } ${active ? "ring-2 ring-primary border-primary" : ""}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
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
  valeTypes: ValeTypeV2[];
  maps: ReturnType<typeof buildMaps> | null;
}) {
  const [openVale, setOpenVale] = useState<string | null>(null);

  if (!site || !maps) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>
            Sitio {lot.sitio} · Manzana {lot.manzana}
          </SheetTitle>
          <SheetDescription>Tipo casa {lot.tipo}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Este sitio del plano no tiene datos en el sistema.
        </div>
      </>
    );
  }

  const prog = siteProgress(site, valeTypes, maps);
  const conEntregas = prog.vales.filter((v) => v.status === "complete" || v.status === "partial");

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          Sitio {site.sitio} · Manzana {site.manzana}
        </SheetTitle>
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
          <h4 className="mb-2 text-sm font-semibold">Vales con entregas</h4>
          {conEntregas.length === 0 ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Aún sin entregas en este sitio.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {conEntregas.map((v) => {
                const vt = valeTypes.find((x) => x.id === v.valeTypeId);
                if (!vt) return null;
                const open = openVale === v.valeTypeId;
                return (
                  <li key={v.valeTypeId} className="rounded-md border bg-muted/30">
                    <button
                      type="button"
                      onClick={() => setOpenVale(open ? null : v.valeTypeId)}
                      className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        <b>{vt.code}</b> · {vt.name}
                      </span>
                      <ValeStatusBadge status={v.status} />
                    </button>
                    {open && (
                      <div className="border-t bg-background/60 px-2.5 py-2">
                        <ValeDetail site={site} valeType={vt} maps={maps} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function ValeDetail({
  site,
  valeType,
  maps,
}: {
  site: Site;
  valeType: ValeTypeV2;
  maps: ReturnType<typeof buildMaps>;
}) {
  const stages = valeBreakdown(site, valeType, maps);
  if (stages.length === 0) {
    return <div className="text-[11px] text-muted-foreground">No aplica a este tipo de casa.</div>;
  }
  return (
    <div className="space-y-2">
      {stages.map(({ stage, items, status }) => (
        <div key={stage.id} className="rounded border bg-card p-2">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[11px] font-semibold">
              E{stage.stage_number} · {stage.name}
            </div>
            <ValeStatusBadge status={status} />
          </div>
          <table className="w-full text-[10.5px]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left font-medium">Material</th>
                <th className="text-right font-medium">Req.</th>
                <th className="text-right font-medium">Entreg.</th>
                <th className="text-right font-medium">Falta</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.material_id} className="border-t">
                  <td className="py-0.5">
                    <b>{it.material?.code ?? "?"}</b>{" "}
                    <span className="text-muted-foreground">
                      {it.material?.description ?? ""}{" "}
                      {it.material?.unit ? `(${it.material.unit})` : ""}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{it.req}</td>
                  <td className="text-right tabular-nums">{it.delivered}</td>
                  <td className="text-right tabular-nums">
                    {it.missing === 0 ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <b className="text-amber-700">{it.missing}</b>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function ValeStatusBadge({ status }: { status: CellStatus }) {
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
          <StatCard label="Total sitios" value={sum.total} />
          <StatCard label="Terminados" value={sum.terminados} accent="#16a34a" />
          <StatCard label="En ejecución" value={sum.enEjecucion} accent="#d97706" />
          <StatCard label="Sin iniciar" value={sum.sinIniciar} accent="#64748b" />
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Distribución por tipo</h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(tipos).map(([k, v]) => (
              <Badge key={k} variant="outline">
                {k}: {v}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
