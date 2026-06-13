import { motion } from "framer-motion";
import { AlertTriangle, Boxes, Home, PackageCheck, TrendingUp, Truck, Wrench } from "lucide-react";
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
import { fmtNumber, housesPossible, incompleteHouses, makeMap, pendingHouses, sumMap } from "@/lib/compute";
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

  const loading =
    cfg.isLoading || houseTypes.isLoading || materials.isLoading || reqs.isLoading;

  const ht = houseTypes.data ?? [];
  const ms = materials.data ?? [];
  const totalHouses = ht.reduce((a, b) => a + b.qty, 0);
  const executedTotal = (vExecuted.data ?? []).reduce((a, b) => a + b.qty, 0);
  const incompleteTotal = incompleteHouses(overrides.data);
  const pending = totalHouses - executedTotal;

  const stockMap = makeMap(vStock.data);
  const stockSum = sumMap(stockMap);

  const reqMap = makeMap(vRequired.data);
  const deliveredMap = makeMap(vDelivered.data);

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

  const pendientes = pendingHouses(ht, vExecuted.data ?? []);

  // Tabla maestra
  const allKeys = new Set<string>([
    ...reqMap.keys(),
    ...(vReceived.data ?? []).map((r) => `${r.material_code}__${r.handedness}`),
    ...deliveredMap.keys(),
    ...stockMap.keys(),
  ]);
  const masterRows = [...allKeys]
    .map((k) => {
      const [code, hand] = k.split("__") as [string, any];
      const required = reqMap.get(k) ?? 0;
      const received =
        (vReceived.data ?? []).find((r) => `${r.material_code}__${r.handedness}` === k)?.qty ?? 0;
      const delivered = deliveredMap.get(k) ?? 0;
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
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
        <KPI icon={Boxes} label="Unidades en stock" value={fmtNumber(stockSum)} />
        <KPI
          icon={AlertTriangle}
          label="Materiales críticos"
          value={fmtNumber(criticals.length)}
          tone={criticals.length ? "warn" : "default"}
          hint={`≤ ${threshold} u.`}
        />
        <KPI
          icon={Truck}
          label="Recepciones acumuladas"
          value={fmtNumber((vReceived.data ?? []).reduce((a, b) => a + b.qty, 0))}
        />
      </div>

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
      <div className="surface-card p-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Tabla maestra de control</h3>
            <p className="text-xs text-muted-foreground">
              Necesario / Recepcionado / Entregado / Saldo / Pendiente por comprar
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Material</th>
                <th className="py-2 pr-3">Sentido</th>
                <th className="py-2 pr-3 text-right">Necesario</th>
                <th className="py-2 pr-3 text-right">Recepcionado</th>
                <th className="py-2 pr-3 text-right">Entregado</th>
                <th className="py-2 pr-3 text-right">Saldo</th>
                <th className="py-2 pr-3 text-right">Pend. comprar</th>
                <th className="py-2 pr-3 text-right">% Cumpl.</th>
              </tr>
            </thead>
            <tbody>
              {masterRows.map((r) => (
                <tr key={`${r.code}-${r.hand}`} className="border-b border-border/50">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{r.code}</div>
                    <div className="text-xs text-muted-foreground">{r.mat?.description ?? "—"}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="chip">{HAND_SHORT[r.hand as keyof typeof HAND_SHORT]}</span>
                  </td>
                  <td className="py-2 pr-3 text-right num-display">{fmtNumber(r.required)}</td>
                  <td className="py-2 pr-3 text-right num-display">{fmtNumber(r.received)}</td>
                  <td className="py-2 pr-3 text-right num-display">{fmtNumber(r.delivered)}</td>
                  <td
                    className={cn(
                      "py-2 pr-3 text-right num-display",
                      r.saldo <= 0 && "text-destructive",
                    )}
                  >
                    {fmtNumber(r.saldo)}
                  </td>
                  <td className="py-2 pr-3 text-right num-display">{fmtNumber(r.pendienteRecep)}</td>
                  <td className="py-2 pr-3 text-right num-display">{r.pct}%</td>
                </tr>
              ))}
              {masterRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    {loading ? "Cargando…" : "Aún no hay datos para mostrar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
