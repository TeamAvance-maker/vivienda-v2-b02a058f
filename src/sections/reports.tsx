import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ArrowDown, ArrowUp, ArrowUpDown, FileDown, FileText, Printer, RefreshCw, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "@/components/app-shell";
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

  function rows() {
    return buildMasterRows({
      required: required.data ?? [],
      received: received.data ?? [],
      delivered: delivered.data ?? [],
      stock: stock.data ?? [],
      materials: materials.data ?? [],
    });
  }

  function exportExcel() {
    const data = rows().map((r) => ({
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
    const data = rows();
    const header = ["Código","Descripción","Sentido","Necesario","Recepcionado","Entregado","Saldo","Pend. comprar","% Cumpl."];
    const csv = [
      header.join(","),
      ...data.map((r) =>
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
      body: rows().map((r) => [
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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reportes"
        description="Exporta la tabla maestra de control en distintos formatos o imprímela tal cual la ves."
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
        <div className="border-b border-border/60 px-4 py-3 font-display text-base font-semibold">Vista previa</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Descripción</th>
                <th className="px-4 py-2.5">Sentido</th>
                <th className="px-4 py-2.5 text-right">Necesario</th>
                <th className="px-4 py-2.5 text-right">Recep.</th>
                <th className="px-4 py-2.5 text-right">Entreg.</th>
                <th className="px-4 py-2.5 text-right">Saldo</th>
                <th className="px-4 py-2.5 text-right">Pend.</th>
                <th className="px-4 py-2.5 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {rows().map((r) => (
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
