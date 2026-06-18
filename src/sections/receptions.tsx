import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EditDialog } from "@/components/edit-dialog";
import { MaterialQuickCreate } from "@/components/material-quick-create";
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
import { SearchableSelect } from "@/components/searchable-select";
import { SectionHeader } from "@/components/app-shell";
import { requestAdminMutation } from "@/components/passphrase-dialog";
import { requestCascadeDelete } from "@/components/cascade-delete-dialog";
import { useMaterials, useReceptions } from "@/lib/queries";
import type { Handedness } from "@/lib/types";
import { HAND_LABEL } from "@/lib/types";
import { fmtDate, fmtNumber } from "@/lib/compute";

export function ReceptionsSection() {
  const list = useReceptions();
  const materials = useMaterials();
  type Row = NonNullable<typeof list.data>[number];
  const [editing, setEditing] = useState<null | Row>(null);
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    date: today,
    guia: "",
    material_code: "",
    handedness: "none" as Handedness,
    qty: 1,
  });
  const [search, setSearch] = useState("");
  const [quickCreate, setQuickCreate] = useState(false);

  const mat = materials.data?.find((m) => m.code === form.material_code);
  const handOpts: Handedness[] = mat?.tracks_handedness ? ["left", "right"] : ["none"];

  function add() {
    if (!form.material_code) return toast.error("Selecciona material");
    if (!form.qty || form.qty <= 0) return toast.error("Cantidad inválida");
    const handed = handOpts.includes(form.handedness) ? form.handedness : handOpts[0];
    requestAdminMutation({
      table: "receptions",
      action: "insert",
      values: {
        date: form.date,
        guia: form.guia.trim(),
        material_code: form.material_code,
        handedness: handed,
        qty: form.qty,
      },
      description: `Registrar recepción del ${form.date} · ${form.material_code} · ${form.qty} u.`,
      onSuccess: () => setForm({ ...form, guia: "", qty: 1 }),
    });
  }

  type SortKey = "date" | "guia" | "material_code" | "handedness" | "qty";
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState<number | "all">(50);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    const base = !s
      ? (list.data ?? [])
      : (list.data ?? []).filter(
          (r) =>
            r.guia.toLowerCase().includes(s) ||
            r.material_code.toLowerCase().includes(s) ||
            r.date.includes(s),
        );
    const sorted = [...base].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), "es", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [list.data, search, sortKey, sortDir]);

  useEffect(() => { setPage(1); }, [search, pageSize, sortKey, sortDir]);

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = pageSize === "all"
    ? filtered
    : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }
  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3" />
      : <ArrowDown className="ml-1 inline h-3 w-3" />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Recepciones"
        description="Registra el material que llega a obra. El stock se actualiza al instante."
      />

      <div className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Nueva recepción</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>Guía</Label>
            <Input value={form.guia} onChange={(e) => setForm({ ...form, guia: e.target.value })} placeholder="G-1234" />
          </div>
          <div className="md:col-span-2">
            <Label>Material</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={form.material_code}
                  onChange={(v) => {
                    const m = materials.data?.find((x) => x.code === v);
                    setForm({ ...form, material_code: v, handedness: m?.tracks_handedness ? "left" : "none" });
                  }}
                  placeholder="Selecciona material"
                  searchPlaceholder="Buscar por código o descripción…"
                  options={(materials.data ?? []).map((m) => ({
                    value: m.code,
                    label: `${m.code} · ${m.description}`,
                    keywords: `${m.code} ${m.description}`,
                  }))}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Crear nuevo material"
                onClick={() => setQuickCreate(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Sentido</Label>
            <Select
              value={form.handedness}
              onValueChange={(v) => setForm({ ...form, handedness: v as Handedness })}
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
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={add}>Registrar recepción</Button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 p-3">
          <Input
            placeholder="Buscar por guía, material, fecha…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <span className="chip">{filtered.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Fecha</th>
                <th className="px-4 py-2.5">Guía</th>
                <th className="px-4 py-2.5">Material</th>
                <th className="px-4 py-2.5">Sentido</th>
                <th className="px-4 py-2.5 text-right">Cantidad</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const m = materials.data?.find((x) => x.code === r.material_code);
                return (
                  <tr key={r.id} className="border-t border-border/50">
                    <td className="px-4 py-2.5">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5">{r.guia || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{r.material_code}</div>
                      <div className="text-xs text-muted-foreground">{m?.description}</div>
                    </td>
                    <td className="px-4 py-2.5">{HAND_LABEL[r.handedness]}</td>
                    <td className="px-4 py-2.5 text-right num-display">{fmtNumber(r.qty)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          requestCascadeDelete({
                            table: "receptions",
                            id: r.id,
                            label: `Recepción del ${fmtDate(r.date)} · ${r.material_code} · ${r.qty} u.`,
                            context: "Esta recepción se eliminará del registro. El stock recalculado lo reflejará.",
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Sin recepciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title="Editar recepción"
          description={`Recepción del ${fmtDate(editing.date)} · ${editing.material_code}`}
          table="receptions"
          match={{ id: editing.id }}
          initial={{
            date: editing.date,
            guia: editing.guia,
            material_code: editing.material_code,
            handedness: editing.handedness,
            qty: editing.qty,
          }}
          fields={[
            { name: "date", label: "Fecha", type: "date" },
            { name: "guia", label: "Guía", type: "text" },
            {
              name: "material_code",
              label: "Material",
              type: "select",
              options: (materials.data ?? []).map((m) => ({
                value: m.code,
                label: `${m.code} · ${m.description}`,
              })),
            },
            {
              name: "handedness",
              label: "Sentido",
              type: "select",
              options: (
                materials.data?.find((m) => m.code === editing.material_code)?.tracks_handedness
                  ? (["left", "right"] as Handedness[])
                  : (["none"] as Handedness[])
              ).map((h) => ({ value: h, label: HAND_LABEL[h] })),
            },
            { name: "qty", label: "Cantidad", type: "number" },
          ]}
        />
      )}

      <MaterialQuickCreate
        open={quickCreate}
        onOpenChange={setQuickCreate}
        onCreated={(code) => {
          const m = materials.data?.find((x) => x.code === code);
          setForm((f) => ({ ...f, material_code: code, handedness: m?.tracks_handedness ? "left" : "none" }));
        }}
      />
    </div>
  );
}
