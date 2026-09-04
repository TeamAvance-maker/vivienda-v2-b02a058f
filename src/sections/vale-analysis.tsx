import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileText, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/app-shell";
import { SearchableSelect } from "@/components/searchable-select";
import {
  SortableTh,
  TablePagination,
  TableToolbar,
  useTableControls,
} from "@/components/data-table";
import { fmtDate } from "@/lib/compute";
import { buildMaps } from "@/lib/sites-compute";
import { analyzeVale, type IncompleteRow, type MatTotals } from "@/lib/vale-analysis";
import { useConfig } from "@/lib/queries";
import {
  useMaterialsV2,
  useSiteDeliveries,
  useSiteDeliveryItems,
  useSites,
  useValeReqs,
  useValeStages,
  useValeTypes,
} from "@/lib/sites-queries";

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="surface-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`num-display mt-1 text-2xl font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function MatTable({ rows }: { rows: MatTotals[] }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Código</th>
            <th className="px-3 py-2">Descripción</th>
            <th className="px-3 py-2">Un.</th>
            <th className="px-3 py-2 text-right">Necesario</th>
            <th className="px-3 py-2 text-right">Asignado</th>
            <th className="px-3 py-2 text-right">Falta</th>
            <th className="px-3 py-2 text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.material_id} className="border-t border-border/50">
              <td className="px-3 py-1.5 font-mono text-xs">{r.code}</td>
              <td className="px-3 py-1.5">{r.description}</td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.unit}</td>
              <td className="px-3 py-1.5 text-right num-display">{r.need}</td>
              <td className="px-3 py-1.5 text-right num-display">{r.assigned}</td>
              <td
                className={`px-3 py-1.5 text-right num-display ${r.missing > 0 ? "font-semibold text-destructive" : ""}`}
              >
                {r.missing}
              </td>
              <td className="px-3 py-1.5 text-right num-display">{r.pct}%</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                Sin materiales.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ValeAnalysisSection() {
  const cfg = useConfig();
  const sites = useSites();
  const valeTypes = useValeTypes();
  const stages = useValeStages();
  const reqs = useValeReqs();
  const materials = useMaterialsV2();
  const deliveries = useSiteDeliveries();
  const items = useSiteDeliveryItems();

  const [valeId, setValeId] = useState("");

  const loading =
    sites.isLoading ||
    valeTypes.isLoading ||
    stages.isLoading ||
    reqs.isLoading ||
    materials.isLoading ||
    deliveries.isLoading ||
    items.isLoading;

  const maps = useMemo(
    () =>
      buildMaps({
        stages: stages.data ?? [],
        reqs: reqs.data ?? [],
        deliveries: deliveries.data ?? [],
        items: items.data ?? [],
        materials: materials.data ?? [],
      }),
    [stages.data, reqs.data, deliveries.data, items.data, materials.data],
  );

  const valeOptions = useMemo(
    () =>
      [...(valeTypes.data ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code, "es"))
        .map((v) => ({
          value: v.id,
          label: `${v.code} · ${v.name}`,
          keywords: `${v.code} ${v.name} ${v.section}`,
          hint: v.section || undefined,
        })),
    [valeTypes.data],
  );

  const vale = useMemo(
    () => (valeTypes.data ?? []).find((v) => v.id === valeId) ?? null,
    [valeTypes.data, valeId],
  );

  const analysis = useMemo(() => {
    if (!vale) return null;
    return analyzeVale({ vale, sites: sites.data ?? [], maps });
  }, [vale, sites.data, maps]);

  const incCtrl = useTableControls<IncompleteRow>({
    data: analysis?.incompleteRows ?? [],
    searchFields: (r) => [r.manzana, r.sitio, r.house_type, r.stageLabel, r.code, r.description],
    sortFns: {
      sitio: (a, b) =>
        a.manzana - b.manzana || a.sitio.localeCompare(b.sitio, "es", { numeric: true }),
      house_type: (a, b) => a.house_type.localeCompare(b.house_type, "es"),
      stageLabel: (a, b) => a.stageLabel.localeCompare(b.stageLabel, "es", { numeric: true }),
      code: (a, b) => a.code.localeCompare(b.code, "es", { numeric: true }),
      missing: (a, b) => a.missing - b.missing,
    },
    numericFilters: [
      { key: "manzana", label: "Manzana", accessor: (r) => r.manzana },
      { key: "missing", label: "Falta", accessor: (r) => r.missing },
    ],
    defaultSort: { key: "sitio", dir: "asc" },
    defaultPageSize: 10,
  });

  function exportExcel() {
    if (!analysis || !vale) return;
    const wb = XLSX.utils.book_new();

    const detalle = analysis.stages.flatMap((s) =>
      s.rows.map((r) => ({
        Etapa: `E${s.stage.stage_number}${s.stage.name ? ` · ${s.stage.name}` : ""}`,
        Código: r.code,
        Descripción: r.description,
        Unidad: r.unit,
        Necesario: r.need,
        Asignado: r.assigned,
        Falta: r.missing,
        "%": r.pct,
      })),
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), "Por etapa");

    const porCasa = analysis.byHouse.flatMap((h) =>
      h.rows.map((r) => ({
        "Tipo casa": h.house_type,
        Sitios: h.sites,
        Código: r.code,
        Descripción: r.description,
        Unidad: r.unit,
        Necesario: r.need,
        Asignado: r.assigned,
        Falta: r.missing,
        "%": r.pct,
      })),
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porCasa), "Por tipo vivienda");

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        analysis.byManzana.map((m) => ({
          Manzana: m.manzana,
          Sitios: m.sitesApply,
          Completos: m.complete,
          Incompletos: m.incomplete,
          Necesario: m.need,
          Asignado: m.assigned,
          Falta: m.missing,
        })),
      ),
      "Por manzana",
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        analysis.general.map((r) => ({
          Código: r.code,
          Descripción: r.description,
          Unidad: r.unit,
          Necesario: r.need,
          Asignado: r.assigned,
          Falta: r.missing,
          "%": r.pct,
        })),
      ),
      "General obra",
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        analysis.incompleteRows.map((r) => ({
          Manzana: r.manzana,
          Sitio: r.sitio,
          "Tipo casa": r.house_type,
          Etapa: r.stageLabel,
          Código: r.code,
          Descripción: r.description,
          Unidad: r.unit,
          Necesario: r.need,
          Asignado: r.assigned,
          Falta: r.missing,
        })),
      ),
      "Sitios incompletos",
    );

    XLSX.writeFile(wb, `analisis-${vale.code}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPdf() {
    if (!analysis || !vale) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(60, 40, 25);
    doc.text(`Análisis de vale · ${vale.code}`, 40, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(vale.name, 40, 68);
    doc.setTextColor(140, 120, 100);
    doc.text(
      `${cfg.data?.name ?? "Mi Obra"} · Generado: ${fmtDate(new Date().toISOString())}`,
      40,
      84,
    );

    const style = {
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: [60, 40, 25] },
      headStyles: { fillColor: [70, 45, 30], textColor: [250, 244, 230] },
      alternateRowStyles: { fillColor: [250, 244, 230] },
      theme: "grid" as const,
    };

    let y = 110;
    for (const s of analysis.stages) {
      doc.setFontSize(11);
      doc.setTextColor(60, 40, 25);
      doc.text(
        `Etapa ${s.stage.stage_number}${s.stage.name ? ` · ${s.stage.name}` : ""} — sitios ${s.sitesComplete}/${s.sitesApply} completos`,
        40,
        y,
      );
      autoTable(doc, {
        ...style,
        startY: y + 8,
        head: [["Código", "Descripción", "Un.", "Necesario", "Asignado", "Falta", "%"]],
        body: s.rows.map((r) => [
          r.code,
          r.description,
          r.unit,
          r.need,
          r.assigned,
          r.missing,
          `${r.pct}%`,
        ]),
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    }

    for (const h of analysis.byHouse) {
      doc.addPage();
      doc.setFontSize(12);
      doc.text(`Tipo de vivienda ${h.house_type} — ${h.sites} sitios`, 40, 50);
      autoTable(doc, {
        ...style,
        startY: 66,
        head: [["Código", "Descripción", "Un.", "Necesario", "Asignado", "Falta", "%"]],
        body: h.rows.map((r) => [
          r.code,
          r.description,
          r.unit,
          r.need,
          r.assigned,
          r.missing,
          `${r.pct}%`,
        ]),
      });
    }

    doc.addPage();
    doc.setFontSize(12);
    doc.text("Por manzana", 40, 50);
    autoTable(doc, {
      ...style,
      startY: 66,
      head: [["Manzana", "Sitios", "Completos", "Incompletos", "Necesario", "Asignado", "Falta"]],
      body: analysis.byManzana.map((m) => [
        m.manzana,
        m.sitesApply,
        m.complete,
        m.incomplete,
        m.need,
        m.assigned,
        m.missing,
      ]),
    });

    doc.addPage();
    doc.setFontSize(12);
    doc.text("General de la obra", 40, 50);
    autoTable(doc, {
      ...style,
      startY: 66,
      head: [["Código", "Descripción", "Un.", "Necesario", "Asignado", "Falta", "%"]],
      body: analysis.general.map((r) => [
        r.code,
        r.description,
        r.unit,
        r.need,
        r.assigned,
        r.missing,
        `${r.pct}%`,
      ]),
    });

    doc.addPage();
    doc.setFontSize(12);
    doc.text("Sitios incompletos", 40, 50);
    autoTable(doc, {
      ...style,
      startY: 66,
      head: [["Mz", "Sitio", "Casa", "Etapa", "Código", "Descripción", "Falta"]],
      body: analysis.incompleteRows.map((r) => [
        r.manzana,
        r.sitio,
        r.house_type,
        r.stageLabel,
        r.code,
        r.description,
        r.missing,
      ]),
    });

    doc.save(`analisis-${vale.code}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Análisis de vale"
        description="Elige un vale y mira sus etapas, lo asignado y lo que falta por tipo de vivienda, por manzana y en toda la obra."
      />

      <div className="surface-card space-y-3 p-5">
        <label className="text-sm font-medium" htmlFor="vale-analysis-select">
          Vale tipo
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-[520px]">
            <SearchableSelect
              id="vale-analysis-select"
              value={valeId}
              onChange={setValeId}
              options={valeOptions}
              placeholder={loading ? "Cargando…" : "Selecciona un vale tipo…"}
              searchPlaceholder="Buscar por código o nombre…"
            />
          </div>
          {analysis && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-[oklch(0.55_0.12_140)] text-white hover:bg-[oklch(0.5_0.12_140)]"
                onClick={exportExcel}
              >
                <Table2 className="h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportPdf}>
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {!vale && (
        <div className="surface-card p-8 text-center text-muted-foreground">
          Selecciona un vale tipo para ver su análisis completo.
        </div>
      )}

      {vale && analysis && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Sitios donde aplica" value={analysis.sitesApply} />
            <Kpi
              label="Completos"
              value={analysis.sitesComplete}
              tone="text-[oklch(0.55_0.12_140)]"
            />
            <Kpi label="Incompletos" value={analysis.sitesIncomplete} tone="text-destructive" />
            <Kpi label="Avance" value={`${analysis.pct}%`} />
            <Kpi label="Material que falta" value={analysis.generalTotals.missing} />
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Por etapa</h3>
            {analysis.stages.map((s) => (
              <div key={s.stage.id} className="surface-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-secondary/40 px-4 py-3">
                  <div className="font-medium">
                    Etapa {s.stage.stage_number}
                    {s.stage.name ? ` · ${s.stage.name}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sitios completos {s.sitesComplete}/{s.sitesApply} · Necesario {s.totals.need} ·
                    Asignado {s.totals.assigned} · Falta {s.totals.missing}
                  </div>
                </div>
                <MatTable rows={s.rows} />
              </div>
            ))}
            {analysis.stages.length === 0 && (
              <div className="surface-card p-6 text-center text-muted-foreground">
                Este vale no tiene etapas con materiales asignados.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Por tipo de vivienda</h3>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {analysis.byHouse.map((h) => (
                <div key={h.house_type} className="surface-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-secondary/40 px-4 py-3">
                    <div className="font-medium">Tipo {h.house_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.sitesComplete}/{h.sites} sitios completos · Falta {h.totals.missing}
                    </div>
                  </div>
                  <MatTable rows={h.rows} />
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="border-b border-border/60 bg-secondary/40 px-4 py-3 font-display text-base font-semibold">
              Por manzana
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Manzana</th>
                    <th className="px-3 py-2 text-right">Sitios</th>
                    <th className="px-3 py-2 text-right">Completos</th>
                    <th className="px-3 py-2 text-right">Incompletos</th>
                    <th className="px-3 py-2 text-right">Necesario</th>
                    <th className="px-3 py-2 text-right">Asignado</th>
                    <th className="px-3 py-2 text-right">Falta</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.byManzana.map((m) => (
                    <tr key={m.manzana} className="border-t border-border/50">
                      <td className="px-3 py-1.5 font-medium">Mz {m.manzana}</td>
                      <td className="px-3 py-1.5 text-right num-display">{m.sitesApply}</td>
                      <td className="px-3 py-1.5 text-right num-display">{m.complete}</td>
                      <td
                        className={`px-3 py-1.5 text-right num-display ${m.incomplete > 0 ? "text-destructive" : ""}`}
                      >
                        {m.incomplete}
                      </td>
                      <td className="px-3 py-1.5 text-right num-display">{m.need}</td>
                      <td className="px-3 py-1.5 text-right num-display">{m.assigned}</td>
                      <td className="px-3 py-1.5 text-right num-display">{m.missing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="border-b border-border/60 bg-secondary/40 px-4 py-3 font-display text-base font-semibold">
              General de la obra
            </div>
            <MatTable rows={analysis.general} />
          </div>

          <div className="surface-card overflow-hidden">
            <TableToolbar
              ctrl={incCtrl}
              title="Sitios incompletos"
              searchPlaceholder="Buscar por manzana, sitio, etapa o material…"
              numericFilters={[
                { key: "manzana", label: "Manzana" },
                { key: "missing", label: "Falta" },
              ]}
            />
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-secondary/80 text-left text-xs uppercase tracking-wider text-muted-foreground backdrop-blur">
                  <tr>
                    <SortableTh ctrl={incCtrl} sortKey="sitio">
                      Mz / Sitio
                    </SortableTh>
                    <SortableTh ctrl={incCtrl} sortKey="house_type">
                      Casa
                    </SortableTh>
                    <SortableTh ctrl={incCtrl} sortKey="stageLabel">
                      Etapa
                    </SortableTh>
                    <SortableTh ctrl={incCtrl} sortKey="code">
                      Material
                    </SortableTh>
                    <SortableTh ctrl={incCtrl} sortKey="missing" align="right">
                      Falta
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {incCtrl.visible.map((r, i) => (
                    <tr
                      key={`${r.siteId}-${r.stageLabel}-${r.code}-${i}`}
                      className="border-t border-border/50"
                    >
                      <td className="px-4 py-2 font-medium">
                        Mz {r.manzana} · {r.sitio}
                      </td>
                      <td className="px-4 py-2">{r.house_type}</td>
                      <td className="px-4 py-2 text-xs">{r.stageLabel}</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs">{r.code}</span> — {r.description}
                      </td>
                      <td className="px-4 py-2 text-right num-display font-semibold text-destructive">
                        {r.missing} {r.unit}
                      </td>
                    </tr>
                  ))}
                  {incCtrl.visible.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No hay sitios incompletos para este vale.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination ctrl={incCtrl} />
          </div>
        </>
      )}
    </div>
  );
}
