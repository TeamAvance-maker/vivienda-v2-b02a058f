import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, FileText, Printer, Table2 } from "lucide-react";
import { useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/app-shell";
import {
  SortableTh,
  TablePagination,
  TableToolbar,
  useTableControls,
} from "@/components/data-table";
import {
  useConfig,
  useMaterials,
  useVDelivered,
  useVReceived,
  useVRequired,
  useVStock,
} from "@/lib/queries";
import { HAND_SHORT } from "@/lib/types";
import { fmtDate } from "@/lib/compute";

function buildMasterRows(opts: {
  required: any[];
  received: any[];
  delivered: any[];
  stock: any[];
  materials: any[];
}) {
  const keys = new Set<string>();
  for (const r of opts.required) keys.add(`${r.material_code}__${r.handedness}`);
  for (const r of opts.received) keys.add(`${r.material_code}__${r.handedness}`);
  for (const r of opts.delivered) keys.add(`${r.material_code}__${r.handedness}`);
  for (const r of opts.stock) keys.add(`${r.material_code}__${r.handedness}`);
  return [...keys]
    .map((k) => {
      const [code, hand] = k.split("__");
      const f = (arr: any[]) =>
        arr.find((x) => `${x.material_code}__${x.handedness}` === k)?.qty ?? 0;
      const required = f(opts.required);
      const received = f(opts.received);
      const delivered = f(opts.delivered);
      const saldo = received - delivered;
      const pendienteRecep = Math.max(0, required - received);
      const pct = required > 0 ? Math.min(100, Math.round((received / required) * 100)) : 0;
      const m = opts.materials.find((x) => x.code === code);
      return {
        code,
        hand,
        description: m?.description ?? "",
        required,
        received,
        delivered,
        saldo,
        pendienteRecep,
        pct,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function ReportsSection() {
  const cfg = useConfig();
  const required = useVRequired();
  const received = useVReceived();
  const delivered = useVDelivered();
  const stock = useVStock();
  const materials = useMaterials();

type MasterRow = ReturnType<typeof buildMasterRows>[number];

export function ReportsSection() {
  const cfg = useConfig();
  const required = useVRequired();
  const received = useVReceived();
  const delivered = useVDelivered();
  const stock = useVStock();
  const materials = useMaterials();

  const allRows = useMemo<MasterRow[]>(
    () =>
      buildMasterRows({
        required: required.data ?? [],
        received: received.data ?? [],
        delivered: delivered.data ?? [],
        stock: stock.data ?? [],
        materials: materials.data ?? [],
      }),
    [required.data, received.data, delivered.data, stock.data, materials.data],
  );

  const ctrl = useTableControls<MasterRow>({
    data: allRows,
    searchFields: (r) => [r.code, r.description, HAND_SHORT[r.hand as keyof typeof HAND_SHORT]],
    sortFns: {
      code: (a, b) => a.code.localeCompare(b.code, "es", { numeric: true }),
      description: (a, b) => a.description.localeCompare(b.description, "es"),
      hand: (a, b) => String(a.hand).localeCompare(String(b.hand)),
      required: (a, b) => a.required - b.required,
      received: (a, b) => a.received - b.received,
      delivered: (a, b) => a.delivered - b.delivered,
      saldo: (a, b) => a.saldo - b.saldo,
      pendienteRecep: (a, b) => a.pendienteRecep - b.pendienteRecep,
      pct: (a, b) => a.pct - b.pct,
    },
    numericFilters: [
      { key: "required", label: "Necesario", accessor: (r) => r.required },
      { key: "received", label: "Recepcionado", accessor: (r) => r.received },
      { key: "delivered", label: "Entregado", accessor: (r) => r.delivered },
      { key: "saldo", label: "Saldo", accessor: (r) => r.saldo },
      { key: "pendienteRecep", label: "Pend. comprar", accessor: (r) => r.pendienteRecep },
      { key: "pct", label: "% Cumplimiento", accessor: (r) => r.pct },
    ],
    defaultSort: { key: "code", dir: "asc" },
    defaultPageSize: 50,
  });

  // Filtrados (todos los registros que pasan filtros, ignorando paginación) — para exportar lo que ve
  const visibleRows = ctrl.filtered;



  function exportExcel() {
    const data = visibleRows.map((r) => ({
      Código: r.code,
      Descripción: r.description,
      Sentido: HAND_SHORT[r.hand as keyof typeof HAND_SHORT],
      Necesario: r.required,
      Recepcionado: r.received,
      Entregado: r.delivered,
      Saldo: r.saldo,
      "Pend. comprar": r.pendienteRecep,
      "% Cumpl.": r.pct,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tabla maestra");
    XLSX.writeFile(wb, `tabla-maestra-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportCsv() {
    const header = ["Código","Descripción","Sentido","Necesario","Recepcionado","Entregado","Saldo","Pend. comprar","% Cumpl."];
    const csv = [
      header.join(","),
      ...visibleRows.map((r) =>
        [r.code, `"${r.description.replace(/"/g, '""')}"`, HAND_SHORT[r.hand as keyof typeof HAND_SHORT], r.required, r.received, r.delivered, r.saldo, r.pendienteRecep, r.pct].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabla-maestra-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const projectName = cfg.data?.name ?? "Mi Obra";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(60, 40, 25);
    doc.text("Control de obra", 40, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(projectName, 40, 68);
    doc.setTextColor(140, 120, 100);
    doc.text(`Generado: ${fmtDate(new Date().toISOString())}`, 40, 84);
    autoTable(doc, {
      startY: 110,
      head: [["Código", "Descripción", "Sentido", "Necesario", "Recep.", "Entreg.", "Saldo", "Pend.", "%"]],
      body: visibleRows.map((r) => [
        r.code,
        r.description,
        HAND_SHORT[r.hand as keyof typeof HAND_SHORT],
        r.required,
        r.received,
        r.delivered,
        r.saldo,
        r.pendienteRecep,
        `${r.pct}%`,
      ]),
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: [60, 40, 25] },
      headStyles: { fillColor: [70, 45, 30], textColor: [250, 244, 230] },
      alternateRowStyles: { fillColor: [250, 244, 230] },
      theme: "grid",
    });
    doc.save(`tabla-maestra-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function NumFilter({ k }: { k: ColKey }) {
    const f = numFilters[k];
    return (
      <div className="flex items-center gap-1">
        <Select value={f.op || "none"} onValueChange={(v) => setNumFilters((p) => ({ ...p, [k]: { ...p[k], op: (v === "none" ? "" : v) as NumOp } }))}>
          <SelectTrigger className="h-7 w-14 px-2 text-xs"><SelectValue placeholder="op" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="=">=</SelectItem>
            <SelectItem value=">">&gt;</SelectItem>
            <SelectItem value="<">&lt;</SelectItem>
            <SelectItem value=">=">&gt;=</SelectItem>
            <SelectItem value="<=">&lt;=</SelectItem>
            <SelectItem value="<>">&lt;&gt;</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={f.val}
          onChange={(e) => setNumFilters((p) => ({ ...p, [k]: { ...p[k], val: e.target.value } }))}
          className="h-7 w-16 px-2 text-right text-xs"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reportes"
        description="Filtra y ordena la tabla como en Excel, luego exporta o imprime sólo lo que ves."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button onClick={exportExcel} className="surface-card flex flex-col items-start gap-2 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <Table2 className="h-6 w-6 text-[oklch(0.4_0.08_115)]" />
          <div className="font-display text-base font-semibold">Excel (.xlsx)</div>
          <div className="text-xs text-muted-foreground">Hoja completa para abrir en Excel/Numbers.</div>
        </button>
        <button onClick={exportCsv} className="surface-card flex flex-col items-start gap-2 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <FileDown className="h-6 w-6 text-[oklch(0.65_0.13_55)]" />
          <div className="font-display text-base font-semibold">CSV</div>
          <div className="text-xs text-muted-foreground">Para importar en cualquier sistema.</div>
        </button>
        <button onClick={exportPdf} className="surface-card flex flex-col items-start gap-2 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <FileText className="h-6 w-6 text-[oklch(0.62_0.135_40)]" />
          <div className="font-display text-base font-semibold">PDF</div>
          <div className="text-xs text-muted-foreground">Plantilla café para imprimir o enviar.</div>
        </button>
        <button onClick={() => window.print()} className="surface-card flex flex-col items-start gap-2 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <Printer className="h-6 w-6 text-foreground/70" />
          <div className="font-display text-base font-semibold">Imprimir</div>
          <div className="text-xs text-muted-foreground">Usa el cuadro de impresión del navegador.</div>
        </button>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="font-display text-base font-semibold">Vista previa</div>
          <div className="flex items-center gap-2">
            <span className="chip">{visibleRows.length} filas</span>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                required.refetch(); received.refetch(); delivered.refetch(); stock.refetch(); materials.refetch();
              }}
            >
              Actualizar
            </Button>
          </div>
        </div>
        <div className="max-h-[65vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-secondary/80 text-left text-xs uppercase tracking-wider text-muted-foreground backdrop-blur">
              <tr>
                <th className="cursor-pointer select-none px-4 py-2.5" onClick={() => toggleSort("code")}>Código<SortIcon k="code" /></th>
                <th className="cursor-pointer select-none px-4 py-2.5" onClick={() => toggleSort("description")}>Descripción<SortIcon k="description" /></th>
                <th className="cursor-pointer select-none px-4 py-2.5" onClick={() => toggleSort("hand")}>Sentido<SortIcon k="hand" /></th>
                <th className="cursor-pointer select-none px-4 py-2.5 text-right" onClick={() => toggleSort("required")}>Necesario<SortIcon k="required" /></th>
                <th className="cursor-pointer select-none px-4 py-2.5 text-right" onClick={() => toggleSort("received")}>Recep.<SortIcon k="received" /></th>
                <th className="cursor-pointer select-none px-4 py-2.5 text-right" onClick={() => toggleSort("delivered")}>Entreg.<SortIcon k="delivered" /></th>
                <th className="cursor-pointer select-none px-4 py-2.5 text-right" onClick={() => toggleSort("saldo")}>Saldo<SortIcon k="saldo" /></th>
                <th className="cursor-pointer select-none px-4 py-2.5 text-right" onClick={() => toggleSort("pendienteRecep")}>Pend.<SortIcon k="pendienteRecep" /></th>
                <th className="cursor-pointer select-none px-4 py-2.5 text-right" onClick={() => toggleSort("pct")}>%<SortIcon k="pct" /></th>
              </tr>
              <tr className="bg-secondary/40">
                <th className="px-2 py-1.5"><Input value={txtFilters.code} onChange={(e) => setTxtFilters((p) => ({ ...p, code: e.target.value }))} className="h-7 text-xs" placeholder="filtrar…" /></th>
                <th className="px-2 py-1.5"><Input value={txtFilters.description} onChange={(e) => setTxtFilters((p) => ({ ...p, description: e.target.value }))} className="h-7 text-xs" placeholder="filtrar…" /></th>
                <th className="px-2 py-1.5"><Input value={txtFilters.hand} onChange={(e) => setTxtFilters((p) => ({ ...p, hand: e.target.value }))} className="h-7 text-xs" placeholder="filtrar…" /></th>
                <th className="px-2 py-1.5 text-right"><NumFilter k="required" /></th>
                <th className="px-2 py-1.5 text-right"><NumFilter k="received" /></th>
                <th className="px-2 py-1.5 text-right"><NumFilter k="delivered" /></th>
                <th className="px-2 py-1.5 text-right"><NumFilter k="saldo" /></th>
                <th className="px-2 py-1.5 text-right"><NumFilter k="pendienteRecep" /></th>
                <th className="px-2 py-1.5 text-right"><NumFilter k="pct" /></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={`${r.code}-${r.hand}`} className="border-t border-border/50">
                  <td className="px-4 py-2">{r.code}</td>
                  <td className="px-4 py-2">{r.description}</td>
                  <td className="px-4 py-2">{HAND_SHORT[r.hand as keyof typeof HAND_SHORT]}</td>
                  <td className="px-4 py-2 text-right num-display">{r.required}</td>
                  <td className="px-4 py-2 text-right num-display">{r.received}</td>
                  <td className="px-4 py-2 text-right num-display">{r.delivered}</td>
                  <td className="px-4 py-2 text-right num-display">{r.saldo}</td>
                  <td className="px-4 py-2 text-right num-display">{r.pendienteRecep}</td>
                  <td className="px-4 py-2 text-right num-display">{r.pct}%</td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Sin filas que coincidan con los filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
