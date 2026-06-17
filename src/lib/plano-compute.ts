import type { Maps } from "./sites-compute";
import { cellStatus } from "./sites-compute";
import type { Site, ValeTypeV2 } from "./sites-types";

export type SiteOverallStatus = "terminado" | "en-ejecucion" | "sin-iniciar" | "bloqueado" | "na";

export interface ValeDetail {
  valeTypeId: string;
  code: string;
  name: string;
  status: "complete" | "partial" | "empty" | "na";
}

export interface SiteProgress {
  pct: number;
  status: SiteOverallStatus;
  vales: ValeDetail[];
  applicable: number;
  completos: number;
}

export function siteProgress(site: Site, valeTypes: ValeTypeV2[], maps: Maps): SiteProgress {
  const vales: ValeDetail[] = valeTypes.map((vt) => ({
    valeTypeId: vt.id,
    code: vt.code,
    name: vt.name,
    status: cellStatus(site, vt, maps),
  }));
  const applicable = vales.filter((v) => v.status !== "na");
  const completos = applicable.filter((v) => v.status === "complete").length;
  const parciales = applicable.filter((v) => v.status === "partial").length;
  const pct = applicable.length === 0 ? 0 : Math.round((completos / applicable.length) * 100);
  let status: SiteOverallStatus;
  if (applicable.length === 0) status = "na";
  else if (completos === applicable.length) status = "terminado";
  else if (completos > 0 || parciales > 0) status = "en-ejecucion";
  else status = "sin-iniciar";
  return { pct, status, vales, applicable: applicable.length, completos };
}

export interface ManzanaSummary {
  total: number;
  terminados: number;
  enEjecucion: number;
  sinIniciar: number;
  bloqueados: number;
  avancePromedio: number;
}

export function manzanaSummary(progresses: SiteProgress[]): ManzanaSummary {
  const total = progresses.length;
  let term = 0,
    exe = 0,
    sin = 0,
    blo = 0,
    sumPct = 0;
  for (const p of progresses) {
    sumPct += p.pct;
    if (p.status === "terminado") term++;
    else if (p.status === "en-ejecucion") exe++;
    else if (p.status === "bloqueado") blo++;
    else sin++;
  }
  return {
    total,
    terminados: term,
    enEjecucion: exe,
    sinIniciar: sin,
    bloqueados: blo,
    avancePromedio: total === 0 ? 0 : Math.round(sumPct / total),
  };
}

export const STATUS_LABEL: Record<SiteOverallStatus, string> = {
  terminado: "Terminado",
  "en-ejecucion": "En ejecución",
  "sin-iniciar": "Sin iniciar",
  bloqueado: "Detenido",
  na: "Sin datos",
};
