import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AlertTriangle, CheckCircle2, Clock, Grid3x3, Home, Layers, PackageCheck, TrendingUp, Wrench } from "lucide-react";
import {
  SortableTh,
  TablePagination,
  TableToolbar,
  useTableControls,
} from "@/components/data-table";
import {
  useConfig,
  useHouseTypes,
  useMaterials,
  useOverrides,
  useReqs,
  useVDelivered,
  useVExecuted,
  useVReceived,
  useVRequired,
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
import { buildMaps, cellStatus } from "@/lib/sites-compute";
import { fmtDate, fmtNumber, housesPossible, incompleteHouses, makeMap, pendingHouses } from "@/lib/compute";
import { HAND_SHORT } from "@/lib/types";
import { cn } from "@/lib/utils";


function KPI({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Home;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "good";
}) {
  return (
    <div className="surface-card group relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "rounded-full p-2",
            tone === "warn" && "bg-destructive/10 text-destructive",
            tone === "good" && "bg-[oklch(0.55_0.08_115/.15)] text-[oklch(0.4_0.08_115)]",
            tone === "default" && "bg-secondary text-foreground/70",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 num-display text-3xl md:text-4xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function DashboardSection() {
  const cfg = useConfig();
  const houseTypes = useHouseTypes();
  const materials = useMaterials();
  const reqs = useReqs();
  const vReceived = useVReceived();
  const vDelivered = useVDelivered();
  const vStock = useVStock();
  const vRequired = useVRequired();
  const vExecuted = useVExecuted();
  const overrides = useOverrides();

  // V2 (sitios y vales)
  const sitesQ = useSites();
  const vtQ = useValeTypes();
  const stagesQ = useValeStages();
  const reqsV2Q = useValeReqs();
  const matsV2Q = useMaterialsV2();
  const sDelivQ = useSiteDeliveries();
  const sItemsQ = useSiteDeliveryItems();

  const loading =
    cfg.isLoading || houseTypes.isLoading || materials.isLoading || reqs.isLoading;

  const ht = houseTypes.data ?? [];
  const ms = materials.data ?? [];
  const totalHouses = ht.reduce((a, b) => a + b.qty, 0);
  const executedTotal = (vExecuted.data ?? []).reduce((a, b) => a + b.qty, 0);
  const incompleteTotal = incompleteHouses(overrides.data);
  const pending = totalHouses - executedTotal;

  const stockMap = makeMap(vStock.data);
  

  const reqMap = makeMap(vRequired.data);
  const deliveredMap = makeMap(vDelivered.data);

  // Entregas v2 agregadas por código de material (handedness "none")
  const v2DeliveredByCode = useMemo(() => {
    const map = new Map<string, number>();
    const matById = new Map((matsV2Q.data ?? []).map((m) => [m.id, m]));
    const delivById = new Map((sDelivQ.data ?? []).map((d) => [d.id, d]));
    for (const it of sItemsQ.data ?? []) {
      if (!delivById.has(it.delivery_id)) continue;
      const m = matById.get(it.material_id);
      if (!m) continue;
      map.set(m.code, (map.get(m.code) ?? 0) + Number(it.qty));
    }
    return map;
  }, [matsV2Q.data, sDelivQ.data, sItemsQ.data]);

  const possible = housesPossible({
    houseTypes: ht,
    reqs: reqs.data ?? [],
    stock: vStock.data ?? [],
    executed: vExecuted.data ?? [],
    materials: ms,
  });

  // Materiales críticos (stock <= umbral pero >0) o agotados
  const threshold = cfg.data?.critical_stock_threshold ?? 10;
  const criticals = [...stockMap.entries()]
    .map(([k, qty]) => {
      const [code, hand] = k.split("__");
      return { code, hand: hand as any, qty };
    })
    .filter((r) => r.qty <= threshold);

  // KPIs Sitios × Vales
  const v2Maps = useMemo(() => {
    if (!stagesQ.data || !reqsV2Q.data || !sDelivQ.data || !sItemsQ.data || !matsV2Q.data) return null;
    return buildMaps({
      stages: stagesQ.data, reqs: reqsV2Q.data,
      deliveries: sDelivQ.data, items: sItemsQ.data, materials: matsV2Q.data,
    });
  }, [stagesQ.data, reqsV2Q.data, sDelivQ.data, sItemsQ.data, matsV2Q.data]);

  // Avance por tipo de vivienda — derivado AUTOMÁTICAMENTE de los sitios v2
  // y del estado de sus vales (una vivienda está "ejecutada" cuando todos
  // sus vales aplicables están completos).
  const pendientes = useMemo(() => {
    const sites = sitesQ.data ?? [];
    const vales = vtQ.data ?? [];
    const totByType = new Map<string, number>();
    const execByType = new Map<string, number>();
    for (const s of sites) {
      totByType.set(s.house_type, (totByType.get(s.house_type) ?? 0) + 1);
      if (!v2Maps || vales.length === 0) continue;
      let appliesAny = false;
      let allComplete = true;
      for (const v of vales) {
        const st = cellStatus(s, v, v2Maps);
        if (st === "na") continue;
        appliesAny = true;
        if (st !== "complete") { allComplete = false; break; }
      }
      if (appliesAny && allComplete) {
        execByType.set(s.house_type, (execByType.get(s.house_type) ?? 0) + 1);
      }
    }
    if (sites.length === 0) {
      return pendingHouses(ht, vExecuted.data ?? []);
    }
    const codes = new Set<string>([
      ...ht.map((h) => h.code),
      ...sites.map((s) => s.house_type),
    ]);
    return [...codes].sort().map((code) => {
      const def = ht.find((h) => h.code === code);
      const total = totByType.get(code) ?? def?.qty ?? 0;
      const executed = execByType.get(code) ?? 0;
      return {
        code,
        name: def?.name ?? "",
        total,
        executed,
        pending: Math.max(0, total - executed),
      };
    });
  }, [sitesQ.data, vtQ.data, v2Maps, ht, vExecuted.data]);

  const valeKpis = useMemo(() => {
    if (!v2Maps || !sitesQ.data || !vtQ.data) return { total: 0, completas: 0, parciales: 0, vacias: 0, porManzana: [] as { manzana: number; total: number; completas: number; pct: number }[] };
    let total = 0, completas = 0, parciales = 0, vacias = 0;
    const perManz = new Map<number, { total: number; completas: number }>();
    for (const s of sitesQ.data) {
      for (const v of vtQ.data) {
        const st = cellStatus(s, v, v2Maps);
        if (st === "na") continue;
        total++;
        const m = perManz.get(s.manzana) ?? { total: 0, completas: 0 };
        m.total++;
        if (st === "complete") { completas++; m.completas++; }
        else if (st === "partial") parciales++;
        else vacias++;
        perManz.set(s.manzana, m);
      }
    }
    const porManzana = [...perManz.entries()]
      .map(([manzana, v]) => ({ manzana, ...v, pct: v.total ? (v.completas / v.total) * 100 : 0 }))
      .sort((a, b) => a.manzana - b.manzana);
    return { total, completas, parciales, vacias, porManzana };
  }, [v2Maps, sitesQ.data, vtQ.data]);

  // Historial completo de entregas por vale (sólo lectura)
  const historialEntregas = useMemo(() => {
    const sitesById = new Map((sitesQ.data ?? []).map((s) => [s.id, s]));
    const stagesById = new Map((stagesQ.data ?? []).map((s) => [s.id, s]));
    const valeById = new Map((vtQ.data ?? []).map((v) => [v.id, v]));
    const countByDeliv = new Map<string, number>();
    for (const it of sItemsQ.data ?? []) {
      countByDeliv.set(it.delivery_id, (countByDeliv.get(it.delivery_id) ?? 0) + 1);
    }
    return (sDelivQ.data ?? []).map((d) => {
      const site = sitesById.get(d.site_id);
      const stage = stagesById.get(d.vale_stage_id);
      const vale = stage ? valeById.get(stage.vale_type_id) : undefined;
      return {
        id: d.id,
        date: d.date,
        createdAt: d.created_at ?? d.date ?? "",
        site,
        vale,
        stageNum: stage?.stage_number,
        materialCount: countByDeliv.get(d.id) ?? 0,
        mode: d.mode,
      };
    });
  }, [sDelivQ.data, sItemsQ.data, sitesQ.data, stagesQ.data, vtQ.data]);

  // Tabla maestra
  const allKeys = new Set<string>([
    ...reqMap.keys(),
    ...(vReceived.data ?? []).map((r) => `${r.material_code}__${r.handedness}`),
    ...deliveredMap.keys(),
    ...stockMap.keys(),
    // claves nuevas v2 (handedness "none")
    ...[...v2DeliveredByCode.keys()].map((c) => `${c}__none`),
  ]);
  const masterRows = [...allKeys]
    .map((k) => {
      const [code, hand] = k.split("__") as [string, any];
      const required = reqMap.get(k) ?? 0;
      const received =
        (vReceived.data ?? []).find((r) => `${r.material_code}__${r.handedness}` === k)?.qty ?? 0;
      const deliveredV1 = deliveredMap.get(k) ?? 0;
      const deliveredV2 = hand === "none" ? (v2DeliveredByCode.get(code) ?? 0) : 0;
      const delivered = deliveredV1 + deliveredV2;
      const saldo = received - delivered;
      const pendienteRecep = Math.max(0, required - received);
      const pct = required > 0 ? Math.min(100, Math.round((received / required) * 100)) : 0;
      const mat = ms.find((m) => m.code === code);
      return { code, hand, mat, required, received, delivered, saldo, pendienteRecep, pct };
    })
    .sort((a, b) => (a.mat?.sort_order ?? 99) - (b.mat?.sort_order ?? 99) || a.code.localeCompare(b.code));



  return (
    <div className="space-y-6">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="hero-card relative overflow-hidden p-6 md:p-8"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[oklch(0.78_0.11_85/.18)] blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[oklch(0.62_0.135_40/.25)] blur-3xl" />
        <div className="relative">
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[oklch(0.85_0.06_80)]">
            Indicador principal
          </div>
          <h2 className="mt-2 max-w-2xl font-display text-lg font-medium text-[oklch(0.93_0.04_80)] md:text-xl">
            Viviendas que pueden completarse con el stock actual
          </h2>
          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
            <div className="num-display text-6xl text-white md:text-7xl">
              {fmtNumber(possible.total)}
            </div>
            <div className="text-sm text-[oklch(0.85_0.06_80)]">
              de <span className="font-medium text-white">{fmtNumber(pending)}</span> viviendas pendientes
            </div>
          </div>
          {possible.limiterLabel ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-[oklch(0.85_0.13_75)]" />
              <span className="text-[oklch(0.93_0.04_80)]">Material limitante:</span>
              <span className="font-medium text-white">
                {possible.limiterLabel}
                {possible.limiterDescription ? ` · ${possible.limiterDescription}` : ""}
              </span>
            </div>
          ) : (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-[oklch(0.93_0.04_80)]">
              <PackageCheck className="h-4 w-4" /> Stock suficiente para todas las viviendas pendientes.
            </div>
          )}
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KPI icon={Home} label="Viviendas totales" value={fmtNumber(totalHouses)} />
        <KPI
          icon={PackageCheck}
          label="Ejecutadas"
          value={fmtNumber(executedTotal)}
          tone="good"
          hint={`${totalHouses ? Math.round((executedTotal / totalHouses) * 100) : 0}% del total`}
        />
        <KPI
          icon={Wrench}
          label="Viviendas incompletas"
          value={fmtNumber(incompleteTotal)}
          tone={incompleteTotal > 0 ? "warn" : "default"}
          hint="Abiertas manualmente"
        />
        <KPI icon={TrendingUp} label="Pendientes" value={fmtNumber(pending)} />
        <KPI
          icon={AlertTriangle}
          label="Materiales críticos"
          value={fmtNumber(criticals.length)}
          tone={criticals.length ? "warn" : "default"}
          hint={`≤ ${threshold} u.`}
        />
      </div>

      {/* Avance Sitios × Vales */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI icon={Grid3x3} label="Sitio × Vale aplicables" value={fmtNumber(valeKpis.total)} />
        <KPI
          icon={CheckCircle2}
          label="Vales completos"
          tone="good"
          value={fmtNumber(valeKpis.completas)}
          hint={valeKpis.total ? `${((valeKpis.completas / valeKpis.total) * 100).toFixed(1)}%` : "—"}
        />
        <KPI
          icon={Layers}
          label="Vales parciales"
          value={fmtNumber(valeKpis.parciales)}
          hint={valeKpis.total ? `${((valeKpis.parciales / valeKpis.total) * 100).toFixed(1)}%` : "—"}
        />
        <KPI
          icon={Clock}
          label="Vales sin tocar"
          value={fmtNumber(valeKpis.vacias)}
          hint={valeKpis.total ? `${((valeKpis.vacias / valeKpis.total) * 100).toFixed(1)}%` : "—"}
        />
      </div>

      {/* Avance por manzana */}
      {valeKpis.porManzana.length > 0 && (
        <div className="surface-card p-5">
          <div className="mb-3 flex items-end justify-between">
            <h3 className="font-display text-lg font-semibold">Avance por manzana</h3>
            <span className="chip">{valeKpis.porManzana.length} manzanas</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {valeKpis.porManzana.map((m) => (
              <div key={m.manzana} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-display text-base font-semibold">Manzana {m.manzana}</div>
                  <span className="chip">{m.completas}/{m.total}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {m.pct.toFixed(1)}% de vales completos
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de entregas por vale */}
      <DeliveriesHistoryTable rows={historialEntregas} />

      {/* Viviendas por tipo */}

      <div className="surface-card p-5">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="font-display text-lg font-semibold">Avance por tipo de vivienda</h3>
          <span className="chip">{ht.length} tipos</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {pendientes.map((p) => {
            const pct = p.total ? Math.round((p.executed / p.total) * 100) : 0;
            return (
              <div
                key={p.code}
                className="rounded-xl border border-border bg-background/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-display text-base font-semibold">{p.code}</div>
                  <span className="chip">{p.name || "—"}</span>
                </div>
                <div className="mt-2 num-display text-2xl">
                  {fmtNumber(p.executed)}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    / {fmtNumber(p.total)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-[oklch(0.55_0.08_115)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.pending} pendientes · {pct}%
                </div>
              </div>
            );
          })}
          {pendientes.length === 0 && (
            <div className="col-span-full text-sm text-muted-foreground">
              No hay tipos de vivienda configurados todavía.
            </div>
          )}
        </div>
      </div>

      {/* Tabla maestra */}
      <MasterTable rows={masterRows} loading={loading} />


      {/* Alertas */}
      <div className="surface-card p-5">
        <h3 className="mb-3 font-display text-lg font-semibold">Alertas</h3>
        <ul className="space-y-2 text-sm">
          {criticals.length === 0 && (
            <li className="text-muted-foreground">Sin alertas de stock crítico.</li>
          )}
          {criticals.map((c) => {
            const mat = ms.find((m) => m.code === c.code);
            const isOut = c.qty <= 0;
            return (
              <li
                key={`${c.code}-${c.hand}`}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2",
                  isOut && "border-destructive/40 bg-destructive/5",
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4",
                      isOut ? "text-destructive" : "text-[oklch(0.7_0.13_70)]",
                    )}
                  />
                  <span className="font-medium">{c.code}</span>
                  <span className="text-xs text-muted-foreground">{mat?.description ?? ""}</span>
                  <span className="chip">{HAND_SHORT[c.hand as keyof typeof HAND_SHORT]}</span>
                </div>
                <div className="num-display">
                  {fmtNumber(c.qty)}{" "}
                  <span className="text-xs text-muted-foreground">
                    {isOut ? "agotado" : "crítico"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type MasterRow = {
  code: string;
  hand: string;
  mat?: { description?: string } | undefined;
  required: number;
  received: number;
  delivered: number;
  saldo: number;
  pendienteRecep: number;
  pct: number;
};

function MasterTable({ rows, loading }: { rows: MasterRow[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(s) ||
        (r.mat?.description ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div className="surface-card p-5">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Tabla maestra de control</h3>
          <p className="text-xs text-muted-foreground">
            Necesario / Recepcionado / Entregado / Saldo / Pendiente por comprar
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código o descripción…"
            className="pl-8"
          />
        </div>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        Mostrando {filtered.length} de {rows.length} materiales
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-md border border-border/60">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card text-left text-xs uppercase tracking-wider text-muted-foreground shadow-sm">
            <tr className="border-b border-border">
              <th className="py-2 px-3">Material</th>
              <th className="py-2 px-3">Sentido</th>
              <th className="py-2 px-3 text-right">Necesario</th>
              <th className="py-2 px-3 text-right">Recepcionado</th>
              <th className="py-2 px-3 text-right">Entregado</th>
              <th className="py-2 px-3 text-right">Saldo</th>
              <th className="py-2 px-3 text-right">Pend. comprar</th>
              <th className="py-2 px-3 text-right">% Cumpl.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.code}-${r.hand}`} className="border-b border-border/50">
                <td className="py-2 px-3">
                  <div className="font-medium">{r.code}</div>
                  <div className="text-xs text-muted-foreground">{r.mat?.description ?? "—"}</div>
                </td>
                <td className="py-2 px-3">
                  <span className="chip">{HAND_SHORT[r.hand as keyof typeof HAND_SHORT]}</span>
                </td>
                <td className="py-2 px-3 text-right num-display">{fmtNumber(r.required)}</td>
                <td className="py-2 px-3 text-right num-display">{fmtNumber(r.received)}</td>
                <td className="py-2 px-3 text-right num-display">{fmtNumber(r.delivered)}</td>
                <td
                  className={cn(
                    "py-2 px-3 text-right num-display",
                    r.saldo <= 0 && "text-destructive",
                  )}
                >
                  {fmtNumber(r.saldo)}
                </td>
                <td className="py-2 px-3 text-right num-display">{fmtNumber(r.pendienteRecep)}</td>
                <td className="py-2 px-3 text-right num-display">{r.pct}%</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  {loading ? "Cargando…" : rows.length === 0 ? "Aún no hay datos para mostrar." : "Sin resultados para tu búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Historial de entregas por vale (sólo lectura, búsqueda/orden/paginación)
// ============================================================
type HistRow = {
  id: string;
  date: string | null | undefined;
  createdAt: string;
  site?: { manzana: number; sitio: number | string } | undefined;
  vale?: { name: string } | undefined;
  stageNum?: number;
  materialCount: number;
  mode: string;
};

function DeliveriesHistoryTable({ rows }: { rows: HistRow[] }) {
  const ctrl = useTableControls<HistRow>({
    data: rows,
    searchFields: (r) => [
      r.site ? `M${r.site.manzana}` : "",
      r.site ? `Sitio ${r.site.sitio}` : "",
      r.vale?.name,
      r.stageNum ? `Etapa ${r.stageNum}` : "",
      r.mode === "auto" ? "Auto-completar" : "Manual",
      fmtDate(r.date ?? ""),
    ],
    sortFns: {
      fecha: (a, b) => a.createdAt.localeCompare(b.createdAt),
      sitio: (a, b) =>
        (a.site?.manzana ?? 0) - (b.site?.manzana ?? 0) ||
        Number(a.site?.sitio ?? 0) - Number(b.site?.sitio ?? 0),
      vale: (a, b) => (a.vale?.name ?? "").localeCompare(b.vale?.name ?? ""),
      etapa: (a, b) => (a.stageNum ?? 0) - (b.stageNum ?? 0),
      materiales: (a, b) => a.materialCount - b.materialCount,
      modo: (a, b) => a.mode.localeCompare(b.mode),
    },
    defaultSort: { key: "fecha", dir: "desc" },
    defaultPageSize: 25,
  });

  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="px-5 pt-5">
        <h3 className="font-display text-lg font-semibold">Historial de entregas por vale</h3>
        <p className="text-xs text-muted-foreground">
          Registro completo (sólo lectura). Usa la búsqueda, el orden y la paginación.
        </p>
      </div>
      <TableToolbar ctrl={ctrl} searchPlaceholder="Buscar por sitio, vale, etapa…" />
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <SortableTh ctrl={ctrl} sortKey="fecha">Fecha</SortableTh>
              <SortableTh ctrl={ctrl} sortKey="sitio">Sitio</SortableTh>
              <SortableTh ctrl={ctrl} sortKey="vale">Vale</SortableTh>
              <SortableTh ctrl={ctrl} sortKey="etapa">Etapa</SortableTh>
              <SortableTh ctrl={ctrl} sortKey="materiales" align="right">Materiales</SortableTh>
              <SortableTh ctrl={ctrl} sortKey="modo">Modo</SortableTh>
            </tr>
          </thead>
          <tbody>
            {ctrl.visible.map((e) => (
              <tr key={e.id} className="border-b border-border/50">
                <td className="px-4 py-2">{fmtDate(e.date ?? "")}</td>
                <td className="px-4 py-2">
                  {e.site ? `M${e.site.manzana} · Sitio ${e.site.sitio}` : "—"}
                </td>
                <td className="px-4 py-2">{e.vale?.name ?? "—"}</td>
                <td className="px-4 py-2">{e.stageNum ?? "—"}</td>
                <td className="px-4 py-2 text-right num-display">{fmtNumber(e.materialCount)}</td>
                <td className="px-4 py-2">
                  <span className="chip">{e.mode === "auto" ? "Auto-completar" : "Manual"}</span>
                </td>
              </tr>
            ))}
            {ctrl.visible.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  {rows.length === 0 ? "Aún no hay entregas registradas." : "Sin resultados para tu búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination ctrl={ctrl} />
    </div>
  );
}


