import { useMemo, useState } from "react";
import { Calculator, FileDown, FileText, Table2 } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SectionHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SortableTh,
  TablePagination,
  TableToolbar,
  useTableControls,
} from "@/components/data-table";
import {
  useMaterialsV2,
  useValeReqs,
  useValeStages,
  useValeTypes,
} from "@/lib/sites-queries";
import { useConfig, useVReceived, useVStock } from "@/lib/queries";
import { fmtDate } from "@/lib/compute";
import type { HouseTypeV2 } from "@/lib/sites-types";

const HOUSE_TYPES: HouseTypeV2[] = ["A1", "A2", "B", "C"];

interface ResultRow {
  material_id: string;
  code: string;
  description: string;
  unit: string;
  needed: number;
  stock: number;
  missing: number;
}

export function SimulatorSection() {
  const cfg = useConfig();
  const valeTypesQ = useValeTypes();
  const valeStagesQ = useValeStages();
  const valeReqsQ = useValeReqs();
  const materialsQ = useMaterialsV2();
  const stockQ = useVStock();

  // Cantidades de casas por tipo
  const [counts, setCounts] = useState<Record<HouseTypeV2, number>>({
    A1: 0,
    A2: 0,
    B: 0,
    C: 0,
  });

  // Vales seleccionados (vale_type_id => Set de etapas; etapa vacía = "todas")
  const [valeSel, setValeSel] = useState<Record<string, Set<string>>>({});

  // Snapshot al apretar "Calcular" para que la tabla no cambie hasta recalcular
  const [snapshot, setSnapshot] = useState<{
    counts: Record<HouseTypeV2, number>;
    valeSel: Record<string, Set<string>>;
  } | null>(null);

  const valeTypes = (valeTypesQ.data ?? []).slice().sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"),
  );
  const stagesByVale = useMemo(() => {
    const m = new Map<string, typeof valeStagesQ.data>();
    for (const s of valeStagesQ.data ?? []) {
      const arr = m.get(s.vale_type_id) ?? [];
      arr.push(s);
      m.set(s.vale_type_id, arr);
    }
    for (const arr of m.values())
      arr!.sort((a, b) => a.stage_number - b.stage_number);
    return m;
  }, [valeStagesQ.data]);

  function toggleVale(id: string) {
    setValeSel((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = new Set(); // vacío = todas las etapas
      return next;
    });
  }

  function toggleStage(valeId: string, stageId: string) {
    setValeSel((prev) => {
      const cur = prev[valeId];
      if (!cur) return prev;
      const next = new Set(cur);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return { ...prev, [valeId]: next };
    });
  }

  const stockByCode = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of stockQ.data ?? [])
      m.set(r.material_code, (m.get(r.material_code) ?? 0) + Number(r.qty ?? 0));
    return m;
  }, [stockQ.data]);

  const results: ResultRow[] = useMemo(() => {
    if (!snapshot) return [];
    const need = new Map<string, number>();
    const reqs = valeReqsQ.data ?? [];
    for (const r of reqs) {
      // ¿el vale-stage de este req está incluido en la selección?
      const stage = (valeStagesQ.data ?? []).find((s) => s.id === r.vale_stage_id);
      if (!stage) continue;
      const sel = snapshot.valeSel[stage.vale_type_id];
      if (!sel) continue;
      if (sel.size > 0 && !sel.has(stage.id)) continue;
      const houses = snapshot.counts[r.house_type] ?? 0;
      if (houses <= 0) continue;
      need.set(
        r.material_id,
        (need.get(r.material_id) ?? 0) + Number(r.qty) * houses,
      );
    }
    const mats = materialsQ.data ?? [];
    const matById = new Map(mats.map((m) => [m.id, m]));
    const rows: ResultRow[] = [];
    for (const [mid, qty] of need) {
      const m = matById.get(mid);
      if (!m) continue;
      const stock = stockByCode.get(m.code) ?? 0;
      rows.push({
        material_id: mid,
        code: m.code,
        description: m.description,
        unit: m.unit,
        needed: qty,
        stock,
        missing: Math.max(0, qty - stock),
      });
    }
    return rows.sort((a, b) =>
      a.code.localeCompare(b.code, "es", { numeric: true }),
    );
  }, [snapshot, valeReqsQ.data, valeStagesQ.data, materialsQ.data, stockByCode]);

  const ctrl = useTableControls<ResultRow>({
    data: results,
    searchFields: (r) => [r.code, r.description],
    sortFns: {
      code: (a, b) => a.code.localeCompare(b.code, "es", { numeric: true }),
      description: (a, b) => a.description.localeCompare(b.description, "es"),
      needed: (a, b) => a.needed - b.needed,
      stock: (a, b) => a.stock - b.stock,
      missing: (a, b) => a.missing - b.missing,
    },
    numericFilters: [
      { key: "needed", label: "Necesario", accessor: (r) => r.needed },
      { key: "stock", label: "Stock", accessor: (r) => r.stock },
      { key: "missing", label: "Faltante", accessor: (r) => r.missing },
    ],
    defaultSort: { key: "code", dir: "asc" },
    defaultPageSize: 25,
  });

  function scenarioTitle(): string {
    if (!snapshot) return "Simulador";
    const casas = HOUSE_TYPES.filter((h) => snapshot.counts[h] > 0)
      .map((h) => `${snapshot.counts[h]}×${h}`)
      .join(" + ");
    const vales = Object.keys(snapshot.valeSel)
      .map((vid) => {
        const v = valeTypes.find((x) => x.id === vid);
        const sel = snapshot.valeSel[vid];
        if (!v) return null;
        if (sel.size === 0) return v.name;
        const stages = (stagesByVale.get(vid) ?? [])
          .filter((s) => sel.has(s.id))
          .map((s) => `E${s.stage_number}`)
          .join(",");
        return `${v.name} (${stages})`;
      })
      .filter(Boolean)
      .join(" + ");
    return `${casas || "Sin casas"} — ${vales || "Sin vales"}`;
  }

  function calcular() {
    // clonar Sets para que el snapshot sea independiente
    const cloned: Record<string, Set<string>> = {};
    for (const [k, v] of Object.entries(valeSel)) cloned[k] = new Set(v);
    setSnapshot({ counts: { ...counts }, valeSel: cloned });
  }

  function exportExcel() {
    const data = ctrl.filtered.map((r) => ({
      Código: r.code,
      Descripción: r.description,
      Unidad: r.unit,
      Necesario: r.needed,
      Stock: r.stock,
      Faltante: r.missing,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Simulador");
    XLSX.writeFile(wb, `simulador-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(60, 40, 25);
    doc.text("Informe dinámico de materiales", 40, 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(cfg.data?.name ?? "Mi Obra", 40, 62);
    doc.setTextColor(120, 100, 80);
    const title = scenarioTitle();
    const wrapped = doc.splitTextToSize(`Escenario: ${title}`, 515);
    doc.text(wrapped, 40, 78);
    doc.text(`Generado: ${fmtDate(new Date().toISOString())}`, 40, 78 + wrapped.length * 12);
    autoTable(doc, {
      startY: 78 + wrapped.length * 12 + 18,
      head: [["Código", "Descripción", "Unidad", "Necesario", "Stock", "Faltante"]],
      body: ctrl.filtered.map((r) => [
        r.code,
        r.description,
        r.unit,
        r.needed,
        r.stock,
        r.missing,
      ]),
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: [60, 40, 25] },
      headStyles: { fillColor: [70, 45, 30], textColor: [250, 244, 230] },
      alternateRowStyles: { fillColor: [250, 244, 230] },
      theme: "grid",
    });
    doc.save(`simulador-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const totalHouses = HOUSE_TYPES.reduce((a, h) => a + (counts[h] || 0), 0);
  const totalValesSel = Object.keys(valeSel).length;
  const canCalc = totalHouses > 0 && totalValesSel > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Simulador / Informe dinámico"
        description="Indica cuántas casas de cada tipo y qué vales (o etapas) quieres incluir. Te muestra cuántos materiales se necesitan en total."
      />

      {/* Paso 1: cantidades de casas */}
      <div className="surface-card p-5">
        <div className="mb-3 font-display text-base font-semibold">
          1) ¿Cuántas casas de cada tipo?
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {HOUSE_TYPES.map((h) => (
            <label key={h} className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Tipo {h}
              </span>
              <Input
                type="number"
                min={0}
                value={counts[h]}
                onChange={(e) =>
                  setCounts((c) => ({
                    ...c,
                    [h]: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Total: <span className="font-semibold">{totalHouses}</span> casas
        </div>
      </div>

      {/* Paso 2: vales y etapas */}
      <div className="surface-card p-5">
        <div className="mb-3 font-display text-base font-semibold">
          2) ¿Qué vales tipo incluir?
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {valeTypes.map((v) => {
            const sel = valeSel[v.id];
            const stages = stagesByVale.get(v.id) ?? [];
            const active = !!sel;
            return (
              <div
                key={v.id}
                className={
                  "rounded-xl border p-3 transition " +
                  (active ? "border-primary/60 bg-primary/5" : "border-border/60")
                }
              >
                <label className="flex items-start gap-2">
                  <Checkbox
                    checked={active}
                    onCheckedChange={() => toggleVale(v.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.code} · {v.section}
                    </div>
                  </div>
                </label>
                {active && stages.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-border/40 pt-2">
                    <div className="text-xs text-muted-foreground">
                      {sel!.size === 0
                        ? "Todas las etapas (marca alguna para limitar)"
                        : `Solo etapas marcadas (${sel!.size})`}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stages.map((s) => {
                        const on = sel!.has(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleStage(v.id, s.id)}
                            className={
                              "rounded-full px-3 py-1 text-xs transition " +
                              (on
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-foreground hover:bg-secondary/80")
                            }
                          >
                            E{s.stage_number} · {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {valeTypes.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No hay vales tipo creados aún.
            </div>
          )}
        </div>
      </div>

      {/* Paso 3: calcular */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={calcular} disabled={!canCalc} className="gap-2">
          <Calculator className="h-4 w-4" />
          Calcular
        </Button>
        {!canCalc && (
          <span className="text-xs text-muted-foreground">
            Debes indicar al menos 1 casa y marcar al menos 1 vale.
          </span>
        )}
        {snapshot && (
          <span className="text-xs text-muted-foreground">
            Escenario: <span className="font-semibold">{scenarioTitle()}</span>
          </span>
        )}
      </div>

      {/* Resultados */}
      {snapshot && (
        <div className="surface-card overflow-hidden">
          <TableToolbar
            ctrl={ctrl}
            title="Materiales necesarios"
            searchPlaceholder="Buscar por código o descripción…"
            numericFilters={[
              { key: "needed", label: "Necesario" },
              { key: "stock", label: "Stock" },
              { key: "missing", label: "Faltante" },
            ]}
            rightSlot={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-[oklch(0.55_0.12_140)] text-white hover:bg-[oklch(0.5_0.12_140)]"
                  onClick={exportExcel}
                >
                  <Table2 className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5"
                  onClick={exportPdf}
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            }
          />
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-secondary/80 text-left text-xs uppercase tracking-wider text-muted-foreground backdrop-blur">
                <tr>
                  <SortableTh ctrl={ctrl} sortKey="code">Código</SortableTh>
                  <SortableTh ctrl={ctrl} sortKey="description">Descripción</SortableTh>
                  <th className="px-4 py-2">Unidad</th>
                  <SortableTh ctrl={ctrl} sortKey="needed" align="right">Necesario</SortableTh>
                  <SortableTh ctrl={ctrl} sortKey="stock" align="right">Stock</SortableTh>
                  <SortableTh ctrl={ctrl} sortKey="missing" align="right">Faltante</SortableTh>
                </tr>
              </thead>
              <tbody>
                {ctrl.visible.map((r) => (
                  <tr key={r.material_id} className="border-t border-border/50">
                    <td className="px-4 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-2">{r.description}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.unit}</td>
                    <td className="px-4 py-2 text-right num-display font-semibold">{r.needed}</td>
                    <td className="px-4 py-2 text-right num-display">{r.stock}</td>
                    <td
                      className={
                        "px-4 py-2 text-right num-display font-semibold " +
                        (r.missing > 0 ? "text-destructive" : "text-emerald-600")
                      }
                    >
                      {r.missing}
                    </td>
                  </tr>
                ))}
                {ctrl.visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No hay materiales requeridos para este escenario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination ctrl={ctrl} />
          <div className="border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">
            <FileDown className="mr-1 inline h-3.5 w-3.5" />
            Los totales suman: cantidad por casa × número de casas, en todos los
            vales y etapas seleccionados. No descuenta entregas hechas.
          </div>
        </div>
      )}
    </div>
  );
}
