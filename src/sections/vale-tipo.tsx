import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/app-shell";
import { requestAdminMutation } from "@/components/passphrase-dialog";
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
import {
  useInvalidateSitesV2,
  useMaterialsV2,
  useValeReqs,
  useValeStages,
  useValeTypes,
} from "@/lib/sites-queries";
import type { HouseTypeV2, ValeReq } from "@/lib/sites-types";

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
    const m = new Map<string, (typeof materials.data)[number]>();
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
    onError: (e: any) => toast.error(e?.message ?? "Error"),
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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Vale Tipo"
        description="Selecciona tipo de vivienda → vale tipo → etapa. Verás los materiales requeridos y podrás crear, editar o eliminar (contraseña obligatoria)."
      />

      {/* Selectores */}
      <div className="surface-card grid grid-cols-1 gap-3 p-5 md:grid-cols-3">
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
          <Select
            value={valeTypeId}
            onValueChange={(v) => {
              setValeTypeId(v);
              setStageId("");
            }}
          >
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {sortedValeTypes.map((vt) => (
                <SelectItem key={vt.id} value={vt.id}>
                  {vt.code} · {vt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              {stagesForType.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Etapa {s.stage_number} · {s.name}
                </SelectItem>
              ))}
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
                <Select value={newMatId} onValueChange={setNewMatId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {sortedMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code} · {m.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                            requestAdminMutation({
                              table: "vale_reqs",
                              action: "delete",
                              match: { id: r.id },
                              description: `Eliminar ${m?.code ?? "material"} de ${houseType} · ${selectedVT?.code} · Etapa ${selectedStage?.stage_number}.`,
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
    </div>
  );
}
