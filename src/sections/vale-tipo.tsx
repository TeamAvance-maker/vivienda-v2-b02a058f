import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, ChevronsUpDown, Pencil, Plus, Repeat2, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SortableTh,
  TablePagination,
  TableToolbar,
  useTableControls,
} from "@/components/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  deleteMaterialWithTransferFn,
  getMaterialImpactFn,
  replaceMaterialInValesFn,
} from "@/lib/material-replace.functions";

import { toast } from "sonner";
import { SectionHeader } from "@/components/app-shell";
import { requestAdminMutation } from "@/components/passphrase-dialog";
import { requestCascadeDelete } from "@/components/cascade-delete-dialog";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminMutateFn } from "@/lib/admin.functions";
import { MaterialQuickCreate } from "@/components/material-quick-create";
import {
  useInvalidateSitesV2,
  useMaterialsV2,
  useValeReqs,
  useValeStages,
  useValeTypes,
} from "@/lib/sites-queries";
import type { HouseTypeV2, MaterialV2, ValeReq, ValeStage, ValeTypeV2 } from "@/lib/sites-types";

const HOUSE_TYPES: HouseTypeV2[] = ["A1", "A2", "B", "C"];

export function ValeTipoSection() {
  const valeTypes = useValeTypes();
  const valeStages = useValeStages();
  const materials = useMaterialsV2();
  const reqs = useValeReqs();
  const invalidate = useInvalidateSitesV2();
  const adminMutate = useServerFn(adminMutateFn);

  const [houseType, setHouseType] = useState<HouseTypeV2>("A1");
  const [valeTypeId, setValeTypeId] = useState<string>("");
  const [stageId, setStageId] = useState<string>("");

  // Add form
  const [newMatId, setNewMatId] = useState<string>("");
  const [newQty, setNewQty] = useState<number>(1);
  const [addPass, setAddPass] = useState("");
  const [matOpen, setMatOpen] = useState(false);
  const [quickCreate, setQuickCreate] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState<ValeReq | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editPass, setEditPass] = useState("");

  const sortedValeTypes = useMemo(
    () =>
      [...(valeTypes.data ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code),
      ),
    [valeTypes.data],
  );

  const stagesForType = useMemo(
    () =>
      (valeStages.data ?? [])
        .filter((s) => s.vale_type_id === valeTypeId)
        .sort((a, b) => a.stage_number - b.stage_number),
    [valeStages.data, valeTypeId],
  );

  const filteredReqs = useMemo(
    () =>
      (reqs.data ?? []).filter(
        (r) =>
          r.house_type === houseType && r.vale_stage_id === stageId,
      ),
    [reqs.data, houseType, stageId],
  );

  const materialsById = useMemo(() => {
    const m = new Map<string, MaterialV2>();
    for (const x of materials.data ?? []) m.set(x.id, x);
    return m;
  }, [materials.data]);

  const sortedMaterials = useMemo(
    () =>
      [...(materials.data ?? [])].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.code.localeCompare(b.code),
      ),
    [materials.data],
  );

  const addMut = useMutation({
    mutationFn: async () => {
      if (!stageId) throw new Error("Selecciona una etapa");
      if (!newMatId) throw new Error("Selecciona un material");
      if (!newQty || newQty <= 0) throw new Error("Cantidad inválida");
      if (!addPass) throw new Error("Contraseña requerida");
      // duplicate guard
      const dup = filteredReqs.find((r) => r.material_id === newMatId);
      if (dup) throw new Error("Ese material ya está en la lista. Edítalo.");
      await adminMutate({
        data: {
          passphrase: addPass,
          table: "vale_reqs",
          action: "insert",
          values: {
            vale_stage_id: stageId,
            house_type: houseType,
            material_id: newMatId,
            qty: newQty,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("Material agregado");
      setNewMatId("");
      setNewQty(1);
      setAddPass("");
      invalidate();
    },
    onError: (e: any) => {
      const msg = String(e?.message ?? "Error");
      if (msg.includes("duplicate key") || msg.includes("vale_reqs_vale_stage_id_house_type_material_id_key")) {
        toast.error("Ese material ya está en la lista. Edita la cantidad en lugar de agregarlo de nuevo.");
      } else {
        toast.error(msg);
      }
    },
  });

  const editMut = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editPass) throw new Error("Contraseña requerida");
      if (!editQty || editQty <= 0) throw new Error("Cantidad inválida");
      await adminMutate({
        data: {
          passphrase: editPass,
          table: "vale_reqs",
          action: "update",
          match: { id: editing.id },
          values: { qty: editQty },
        },
      });
    },
    onSuccess: () => {
      toast.success("Actualizado");
      setEditing(null);
      setEditPass("");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const selectedVT = sortedValeTypes.find((v) => v.id === valeTypeId);
  const selectedStage = stagesForType.find((s) => s.id === stageId);

  const selectorsRef = useRef<HTMLDivElement | null>(null);
  function goToReq(r: ValeReq) {
    const stage = (valeStages.data ?? []).find((s) => s.id === r.vale_stage_id);
    if (!stage) return;
    setHouseType(r.house_type);
    setValeTypeId(stage.vale_type_id);
    setStageId(stage.id);
    setTimeout(() => {
      selectorsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Vale Tipo"
        description="Selecciona tipo de vivienda → vale tipo → etapa. Verás los materiales requeridos y podrás crear, editar o eliminar (contraseña obligatoria)."
      />

      <MaterialSearchPanel onGo={goToReq} />


      {/* Selectores */}
      <div ref={selectorsRef} className="surface-card grid grid-cols-1 gap-3 p-5 md:grid-cols-3">
        <div>
          <Label>Tipo de vivienda</Label>
          <Select
            value={houseType}
            onValueChange={(v) => setHouseType(v as HouseTypeV2)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {HOUSE_TYPES.map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Vale tipo</Label>
          <SearchableSelect
            value={valeTypeId}
            onChange={(v) => {
              setValeTypeId(v);
              setStageId("");
            }}
            placeholder="Selecciona vale tipo"
            searchPlaceholder="Buscar vale…"
            options={sortedValeTypes.map((vt) => ({
              value: vt.id,
              label: `${vt.code} · ${vt.name}`,
              keywords: `${vt.code} ${vt.name}`,
            }))}
          />
        </div>
        <div>
          <Label>Etapa</Label>
          <Select
            value={stageId}
            onValueChange={setStageId}
            disabled={!valeTypeId}
          >
            <SelectTrigger>
              <SelectValue placeholder={valeTypeId ? "Selecciona etapa" : "Primero el vale tipo"} />
            </SelectTrigger>
            <SelectContent>
              {stagesForType.map((s) => {
                const prefix = `Etapa ${s.stage_number}`;
                const label = s.name && s.name.trim() && s.name.trim() !== prefix
                  ? `${prefix} · ${s.name}`
                  : prefix;
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {label}
                  </SelectItem>
                );
              })}
              {stagesForType.length === 0 && valeTypeId && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Sin etapas
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de materiales */}
      {stageId ? (
        <>
          <div className="surface-card p-5">
            <h3 className="mb-3 font-display text-base font-semibold">
              Agregar material a {houseType} · {selectedVT?.code} · Etapa {selectedStage?.stage_number}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Material</Label>
                <div className="flex gap-2">
                  <Popover open={matOpen} onOpenChange={setMatOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "flex-1 justify-between font-normal",
                          !newMatId && "text-muted-foreground",
                        )}
                      >
                        {newMatId
                          ? (() => {
                              const m = materialsById.get(newMatId);
                              return m ? `${m.code} · ${m.description}` : "Selecciona";
                            })()
                          : "Selecciona o busca…"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command
                        filter={(value, search) => {
                          if (!search) return 1;
                          return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                        }}
                      >
                        <CommandInput placeholder="Buscar por código o descripción…" />
                        <CommandList className="max-h-72">
                          <CommandEmpty>Sin resultados.</CommandEmpty>
                          <CommandGroup>
                            {sortedMaterials.map((m) => (
                              <CommandItem
                                key={m.id}
                                value={`${m.code} ${m.description}`}
                                onSelect={() => {
                                  setNewMatId(m.id);
                                  setMatOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newMatId === m.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <span className="font-mono text-xs mr-2">{m.code}</span>
                                <span className="truncate">{m.description}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Crear nuevo material"
                    onClick={() => { setMatOpen(false); setQuickCreate(true); }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={addPass}
                  onChange={(e) => setAddPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => addMut.mutate()}
                disabled={addMut.isPending}
              >
                <Plus className="mr-1 h-4 w-4" />
                {addMut.isPending ? "Agregando…" : "Agregar"}
              </Button>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Código</th>
                  <th className="px-4 py-2.5">Descripción</th>
                  <th className="px-4 py-2.5">Unidad</th>
                  <th className="px-4 py-2.5 text-right">Cantidad</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredReqs.map((r) => {
                  const m = materialsById.get(r.material_id);
                  return (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="px-4 py-2.5 font-medium">{m?.code ?? "?"}</td>
                      <td className="px-4 py-2.5">{m?.description ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m?.unit ?? ""}</td>
                      <td className="px-4 py-2.5 text-right num-display">{r.qty}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(r);
                            setEditQty(r.qty);
                            setEditPass("");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            requestCascadeDelete({
                              table: "vale_reqs",
                              id: r.id,
                              label: `${m?.code ?? "material"} en ${houseType} · ${selectedVT?.code} · Etapa ${selectedStage?.stage_number}`,
                              context: "Solo se elimina este requisito puntual de la etapa.",
                              onSuccess: invalidate,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredReqs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Sin materiales cargados para esta combinación.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          Selecciona tipo de vivienda, vale tipo y etapa para ver los materiales.
        </div>
      )}

      {/* Edit dialog */}
      <AlertDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar cantidad</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {materialsById.get(editing?.material_id ?? "")?.code} ·{" "}
              {materialsById.get(editing?.material_id ?? "")?.description}
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={editQty}
                onChange={(e) => setEditQty(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={editPass}
                onChange={(e) => setEditPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!editPass || editMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                editMut.mutate();
              }}
            >
              {editMut.isPending ? "Guardando…" : "Guardar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MaterialQuickCreate
        open={quickCreate}
        onOpenChange={setQuickCreate}
        onCreated={(code) => {
          const m = (materials.data ?? []).find((x) => x.code === code);
          if (m) setNewMatId(m.id);
        }}
      />
    </div>
  );
}

// ============================================================
// Buscador de material en vales (tabla de apariciones)
// ============================================================

type SearchRow = {
  req: ValeReq;
  houseType: HouseTypeV2;
  valeCode: string;
  valeName: string;
  stageNumber: number;
  stageName: string;
  qty: number;
  unit: string;
};

function MaterialSearchPanel({ onGo }: { onGo: (r: ValeReq) => void }) {
  const materials = useMaterialsV2();
  const valeTypes = useValeTypes();
  const valeStages = useValeStages();
  const reqs = useValeReqs();
  const invalidate = useInvalidateSitesV2();
  const adminMutate = useServerFn(adminMutateFn);

  const [materialId, setMaterialId] = useState<string>("");

  // Edit dialog
  const [editing, setEditing] = useState<SearchRow | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editPass, setEditPass] = useState("");

  const sortedMaterials = useMemo(
    () =>
      [...(materials.data ?? [])].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.code.localeCompare(b.code),
      ),
    [materials.data],
  );

  const stagesById = useMemo(() => {
    const m = new Map<string, ValeStage>();
    for (const s of valeStages.data ?? []) m.set(s.id, s);
    return m;
  }, [valeStages.data]);

  const valeTypesById = useMemo(() => {
    const m = new Map<string, ValeTypeV2>();
    for (const v of valeTypes.data ?? []) m.set(v.id, v);
    return m;
  }, [valeTypes.data]);

  const selectedMat = (materials.data ?? []).find((m) => m.id === materialId) ?? null;

  const rows: SearchRow[] = useMemo(() => {
    if (!materialId) return [];
    const out: SearchRow[] = [];
    for (const r of reqs.data ?? []) {
      if (r.material_id !== materialId) continue;
      const stage = stagesById.get(r.vale_stage_id);
      if (!stage) continue;
      const vt = valeTypesById.get(stage.vale_type_id);
      if (!vt) continue;
      out.push({
        req: r,
        houseType: r.house_type,
        valeCode: vt.code,
        valeName: vt.name,
        stageNumber: stage.stage_number,
        stageName: stage.name ?? "",
        qty: r.qty,
        unit: selectedMat?.unit ?? "",
      });
    }
    return out;
  }, [reqs.data, materialId, stagesById, valeTypesById, selectedMat]);

  const ctrl = useTableControls<SearchRow>({
    data: rows,
    searchFields: (r) => [
      r.houseType,
      r.valeCode,
      r.valeName,
      `Etapa ${r.stageNumber}`,
      r.stageName,
      String(r.qty),
    ],
    sortFns: {
      house: (a, b) => a.houseType.localeCompare(b.houseType, "es"),
      vale: (a, b) => a.valeCode.localeCompare(b.valeCode, "es", { numeric: true }),
      stage: (a, b) => a.stageNumber - b.stageNumber,
      qty: (a, b) => a.qty - b.qty,
    },
    defaultSort: { key: "house", dir: "asc" },
    defaultPageSize: 25,
  });

  const editMut = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editPass) throw new Error("Contraseña requerida");
      if (!editQty || editQty <= 0) throw new Error("Cantidad inválida");
      await adminMutate({
        data: {
          passphrase: editPass,
          table: "vale_reqs",
          action: "update",
          match: { id: editing.req.id },
          values: { qty: editQty },
        },
      });
    },
    onSuccess: () => {
      toast.success("Actualizado");
      setEditing(null);
      setEditPass("");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-border/60 p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
          <Search className="h-4 w-4" />
          Buscar material en vales
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Elige un material y verás en qué vales y etapas aparece. Haz clic en una fila para ir a ese vale.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <SearchableSelect
            value={materialId}
            onChange={setMaterialId}
            placeholder="Selecciona o busca material…"
            searchPlaceholder="Buscar por código o descripción…"
            options={sortedMaterials.map((m) => ({
              value: m.id,
              label: `${m.code} · ${m.description}`,
              hint: m.unit,
              keywords: `${m.code} ${m.description} ${m.unit}`,
            }))}
          />
          {materialId && (
            <Button variant="ghost" onClick={() => setMaterialId("")}>Limpiar</Button>
          )}
        </div>
      </div>

      {materialId ? (
        <>
          <TableToolbar
            ctrl={ctrl}
            searchPlaceholder="Buscar en resultados (tipo, vale, etapa)…"
          />
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-secondary/80 text-left text-xs uppercase tracking-wider text-muted-foreground backdrop-blur">
                <tr>
                  <SortableTh ctrl={ctrl} sortKey="house">Tipo casa</SortableTh>
                  <SortableTh ctrl={ctrl} sortKey="vale">Vale</SortableTh>
                  <SortableTh ctrl={ctrl} sortKey="stage">Etapa</SortableTh>
                  <SortableTh ctrl={ctrl} sortKey="qty" align="right">Cantidad</SortableTh>
                  <th className="px-4 py-2.5">Unidad</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ctrl.visible.map((r) => {
                  const stageLabel =
                    r.stageName && r.stageName.trim() && r.stageName.trim() !== `Etapa ${r.stageNumber}`
                      ? `Etapa ${r.stageNumber} · ${r.stageName}`
                      : `Etapa ${r.stageNumber}`;
                  return (
                    <tr
                      key={r.req.id}
                      className="cursor-pointer border-t border-border/60 hover:bg-secondary/40"
                      onClick={() => onGo(r.req)}
                    >
                      <td className="px-4 py-2.5 font-medium">{r.houseType}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs mr-2">{r.valeCode}</span>
                        <span className="text-muted-foreground">{r.valeName}</span>
                      </td>
                      <td className="px-4 py-2.5">{stageLabel}</td>
                      <td className="px-4 py-2.5 text-right num-display">{r.qty}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.unit}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ir al vale"
                          onClick={() => onGo(r.req)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar cantidad"
                          onClick={() => {
                            setEditing(r);
                            setEditQty(r.qty);
                            setEditPass("");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          onClick={() =>
                            requestCascadeDelete({
                              table: "vale_reqs",
                              id: r.req.id,
                              label: `${selectedMat?.code ?? "material"} en ${r.houseType} · ${r.valeCode} · ${stageLabel}`,
                              context: "Solo se elimina este requisito puntual de la etapa.",
                              onSuccess: invalidate,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {ctrl.visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {rows.length === 0
                        ? "Este material no aparece en ningún vale."
                        : "Sin resultados para esos filtros."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination ctrl={ctrl} />
        </>
      ) : (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Selecciona un material para ver dónde se usa.
        </div>
      )}

      <AlertDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar cantidad</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {selectedMat?.code} · {selectedMat?.description} — {editing?.houseType} · {editing?.valeCode} · Etapa {editing?.stageNumber}
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={editQty}
                onChange={(e) => setEditQty(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={editPass}
                onChange={(e) => setEditPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={editMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!editPass || editMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                editMut.mutate();
              }}
            >
              {editMut.isPending ? "Guardando…" : "Guardar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

