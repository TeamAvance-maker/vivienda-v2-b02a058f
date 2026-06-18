import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionHeader } from "@/components/app-shell";
import { requestAdminMutation } from "@/components/passphrase-dialog";
import { useConfig, useHouseTypes, useInvalidateAll, useOverrides } from "@/lib/queries";
import { fmtDate } from "@/lib/compute";
import { supabase } from "@/integrations/supabase/client";
import { BACKUP_TABLES, restoreBackupFn } from "@/lib/backup.functions";

export function ConfigSection() {
  const cfg = useConfig();
  const types = useHouseTypes();
  const overrides = useOverrides();

  const [name, setName] = useState("");
  const [total, setTotal] = useState(0);
  const [thr, setThr] = useState(10);
  useEffect(() => {
    if (cfg.data) {
      setName(cfg.data.name);
      setTotal(cfg.data.total_houses);
      setThr(cfg.data.critical_stock_threshold);
    }
  }, [cfg.data]);

  function saveConfig() {
    requestAdminMutation({
      table: "project_config",
      action: "update",
      match: { id: 1 },
      values: { name, total_houses: total, critical_stock_threshold: thr, updated_at: new Date().toISOString() },
      description: "Actualizar la configuración del proyecto.",
    });
  }

  // ===== Override manual =====
  const [ov, setOv] = useState({ house_type_code: "", delta: 0, reason: "" });
  function submitOverride() {
    if (!ov.house_type_code) return toast.error("Selecciona un tipo");
    if (!ov.delta) return toast.error("Indica el ajuste (positivo o negativo)");
    requestAdminMutation({
      table: "house_exec_overrides",
      action: "insert",
      values: {
        house_type_code: ov.house_type_code,
        delta: ov.delta,
        reason: ov.reason,
        date: new Date().toISOString().slice(0, 10),
      },
      description: `Ajustar manualmente ${ov.delta > 0 ? "+" : ""}${ov.delta} vivienda(s) de tipo ${ov.house_type_code}.`,
      onSuccess: () => setOv({ house_type_code: "", delta: 0, reason: "" }),
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Configuración del proyecto"
        description="Nombre, total objetivo y umbral de stock crítico. También ajustes manuales de viviendas ejecutadas."
      />

      <div className="surface-card p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>Nombre del proyecto</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Cantidad total objetivo</Label>
            <Input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
          </div>
          <div>
            <Label>Umbral stock crítico</Label>
            <Input type="number" value={thr} onChange={(e) => setThr(Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveConfig}>Guardar (pide contraseña)</Button>
        </div>
      </div>

      <div className="surface-card p-5">
        <h3 className="mb-1 font-display text-lg font-semibold">Ajuste manual de viviendas ejecutadas</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Úsalo si hubo error en una entrega. Usa números positivos para sumar viviendas o negativos para descontar.
          Cada ajuste queda registrado.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <Label>Tipo</Label>
            <Select value={ov.house_type_code} onValueChange={(v) => setOv({ ...ov, house_type_code: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {(types.data ?? []).map((t) => (
                  <SelectItem key={t.code} value={t.code}>{t.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ajuste (±)</Label>
            <Input type="number" value={ov.delta} onChange={(e) => setOv({ ...ov, delta: Number(e.target.value) })} />
          </div>
          <div className="md:col-span-2">
            <Label>Motivo</Label>
            <Input value={ov.reason} onChange={(e) => setOv({ ...ov, reason: e.target.value })} placeholder="Corrección de digitación, etc." />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={submitOverride}>Aplicar ajuste (pide contraseña)</Button>
        </div>

        <div className="mt-5">
          <h4 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Historial de ajustes</h4>
          <ul className="space-y-1 text-sm">
            {(overrides.data ?? []).map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
                <span>
                  <b>{fmtDate(o.date)}</b> · {o.house_type_code} · <span className={o.delta > 0 ? "text-[oklch(0.4_0.08_115)]" : "text-destructive"}>{o.delta > 0 ? "+" : ""}{o.delta}</span>
                </span>
                <span className="text-xs text-muted-foreground">{o.reason || "—"}</span>
              </li>
            ))}
            {(overrides.data ?? []).length === 0 && (
              <li className="text-muted-foreground">Sin ajustes manuales registrados.</li>
            )}
          </ul>
        </div>
      </div>

      <BackupRestoreCard />

      <DeletionLogCard />

      <DangerZoneCard />

      <div className="surface-card border-dashed p-5 text-sm text-muted-foreground">
        <p>
          <b>Sobre la contraseña «TheDoors».</b> Esta app funciona sin usuarios y cualquier persona con el enlace puede
          consultar y registrar movimientos. Para modificar o eliminar registros se valida la contraseña en el servidor.
          Si más adelante necesitas seguridad real (con usuarios individuales y permisos), podemos migrar a login completo.
        </p>
      </div>
    </div>
  );
}
