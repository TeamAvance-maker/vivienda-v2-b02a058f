import type { Maps } from "./sites-compute";
import type { HouseTypeV2, MaterialV2, Site, ValeStage, ValeTypeV2 } from "./sites-types";

export interface MatTotals {
  material_id: string;
  code: string;
  description: string;
  unit: string;
  need: number;
  assigned: number;
  missing: number;
  pct: number;
}

export interface StageBlock {
  stage: ValeStage;
  rows: MatTotals[];
  totals: { need: number; assigned: number; missing: number };
  sitesApply: number;
  sitesComplete: number;
}

export interface HouseBlock {
  house_type: HouseTypeV2;
  sites: number;
  sitesComplete: number;
  rows: MatTotals[];
  totals: { need: number; assigned: number; missing: number };
}

export interface ManzanaRow {
  manzana: number;
  sitesApply: number;
  complete: number;
  incomplete: number;
  need: number;
  assigned: number;
  missing: number;
}

export interface IncompleteRow {
  siteId: string;
  manzana: number;
  sitio: string;
  house_type: HouseTypeV2;
  stageLabel: string;
  code: string;
  description: string;
  unit: string;
  need: number;
  assigned: number;
  missing: number;
}

export interface ValeAnalysis {
  stages: StageBlock[];
  byHouse: HouseBlock[];
  byManzana: ManzanaRow[];
  general: MatTotals[];
  generalTotals: { need: number; assigned: number; missing: number };
  incompleteRows: IncompleteRow[];
  sitesApply: number;
  sitesComplete: number;
  sitesIncomplete: number;
  pct: number;
}

type Acc = Map<string, { need: number; assigned: number; missing: number }>;

function add(acc: Acc, matId: string, need: number, assigned: number) {
  const cur = acc.get(matId) ?? { need: 0, assigned: 0, missing: 0 };
  cur.need += need;
  cur.assigned += assigned;
  cur.missing += Math.max(0, need - assigned);
  acc.set(matId, cur);
}

function toRows(acc: Acc, matById: Map<string, MaterialV2>): MatTotals[] {
  return [...acc.entries()]
    .map(([material_id, t]) => {
      const m = matById.get(material_id);
      return {
        material_id,
        code: m?.code ?? "—",
        description: m?.description ?? "(material eliminado)",
        unit: m?.unit ?? "un",
        need: t.need,
        assigned: t.assigned,
        missing: t.missing,
        pct: t.need > 0 ? Math.min(100, Math.round((t.assigned / t.need) * 100)) : 0,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true }));
}

function sumTotals(rows: MatTotals[]) {
  return rows.reduce(
    (s, r) => ({
      need: s.need + r.need,
      assigned: s.assigned + r.assigned,
      missing: s.missing + r.missing,
    }),
    { need: 0, assigned: 0, missing: 0 },
  );
}

/**
 * Analiza un vale tipo: recorre cada sitio y cada etapa del vale, compara lo
 * requerido (vale_reqs por tipo de casa) contra lo entregado
 * (site_delivery_items) y arma los cortes por etapa, tipo de vivienda,
 * manzana, obra general y sitios incompletos.
 */
export function analyzeVale(input: {
  vale: ValeTypeV2;
  sites: Site[];
  maps: Maps;
}): ValeAnalysis {
  const { vale, sites, maps } = input;
  const stages = maps.stagesByVale.get(vale.id) ?? [];

  const generalAcc: Acc = new Map();
  const stageAcc = new Map<string, Acc>();
  const stageSites = new Map<string, { apply: number; complete: number }>();
  const houseAcc = new Map<HouseTypeV2, Acc>();
  const houseSites = new Map<HouseTypeV2, { apply: number; complete: number }>();
  const manzanaAcc = new Map<
    number,
    { apply: number; complete: number; need: number; assigned: number; missing: number }
  >();
  const incompleteRows: IncompleteRow[] = [];

  let sitesApply = 0;
  let sitesComplete = 0;

  for (const site of sites) {
    let applies = false;
    let complete = true;

    for (const st of stages) {
      const reqs = maps.reqsByStageHouse.get(st.id)?.get(site.house_type) ?? [];
      if (reqs.length === 0) continue;
      applies = true;
      let stageComplete = true;
      const delivered = maps.deliveredBySiteStageMat.get(site.id)?.get(st.id) ?? new Map();

      if (!stageAcc.has(st.id)) stageAcc.set(st.id, new Map());
      if (!houseAcc.has(site.house_type)) houseAcc.set(site.house_type, new Map());
      const mAcc = manzanaAcc.get(site.manzana) ?? {
        apply: 0,
        complete: 0,
        need: 0,
        assigned: 0,
        missing: 0,
      };

      for (const r of reqs) {
        const got = delivered.get(r.material_id) ?? 0;
        const assigned = Math.min(got, r.qty);
        const missing = Math.max(0, r.qty - got);
        add(generalAcc, r.material_id, r.qty, assigned);
        add(stageAcc.get(st.id)!, r.material_id, r.qty, assigned);
        add(houseAcc.get(site.house_type)!, r.material_id, r.qty, assigned);
        mAcc.need += r.qty;
        mAcc.assigned += assigned;
        mAcc.missing += missing;
        if (missing > 0) {
          stageComplete = false;
          complete = false;
          const mat = maps.matById.get(r.material_id);
          incompleteRows.push({
            siteId: site.id,
            manzana: site.manzana,
            sitio: site.sitio,
            house_type: site.house_type,
            stageLabel: `E${st.stage_number}${st.name ? ` · ${st.name}` : ""}`,
            code: mat?.code ?? "—",
            description: mat?.description ?? "(material eliminado)",
            unit: mat?.unit ?? "un",
            need: r.qty,
            assigned,
            missing,
          });
        }
      }
      manzanaAcc.set(site.manzana, mAcc);

      const ss = stageSites.get(st.id) ?? { apply: 0, complete: 0 };
      ss.apply += 1;
      if (stageComplete) ss.complete += 1;
      stageSites.set(st.id, ss);
    }

    if (!applies) continue;
    sitesApply += 1;
    if (complete) sitesComplete += 1;

    const hs = houseSites.get(site.house_type) ?? { apply: 0, complete: 0 };
    hs.apply += 1;
    if (complete) hs.complete += 1;
    houseSites.set(site.house_type, hs);

    const mAcc = manzanaAcc.get(site.manzana)!;
    mAcc.apply += 1;
    if (complete) mAcc.complete += 1;
  }

  const stageBlocks: StageBlock[] = stages
    .filter((st) => stageAcc.has(st.id))
    .map((st) => {
      const rows = toRows(stageAcc.get(st.id)!, maps.matById);
      const ss = stageSites.get(st.id) ?? { apply: 0, complete: 0 };
      return {
        stage: st,
        rows,
        totals: sumTotals(rows),
        sitesApply: ss.apply,
        sitesComplete: ss.complete,
      };
    });

  const HOUSE_ORDER: HouseTypeV2[] = ["A1", "A2", "B", "C"];
  const byHouse: HouseBlock[] = HOUSE_ORDER.filter((h) => houseAcc.has(h)).map((h) => {
    const rows = toRows(houseAcc.get(h)!, maps.matById);
    const hs = houseSites.get(h) ?? { apply: 0, complete: 0 };
    return {
      house_type: h,
      sites: hs.apply,
      sitesComplete: hs.complete,
      rows,
      totals: sumTotals(rows),
    };
  });

  const byManzana: ManzanaRow[] = [...manzanaAcc.entries()]
    .map(([manzana, v]) => ({
      manzana,
      sitesApply: v.apply,
      complete: v.complete,
      incomplete: v.apply - v.complete,
      need: v.need,
      assigned: v.assigned,
      missing: v.missing,
    }))
    .sort((a, b) => a.manzana - b.manzana);

  const general = toRows(generalAcc, maps.matById);
  const generalTotals = sumTotals(general);

  incompleteRows.sort(
    (a, b) =>
      a.manzana - b.manzana ||
      a.sitio.localeCompare(b.sitio, "es", { numeric: true }) ||
      a.stageLabel.localeCompare(b.stageLabel, "es", { numeric: true }) ||
      a.code.localeCompare(b.code, "es", { numeric: true }),
  );

  return {
    stages: stageBlocks,
    byHouse,
    byManzana,
    general,
    generalTotals,
    incompleteRows,
    sitesApply,
    sitesComplete,
    sitesIncomplete: sitesApply - sitesComplete,
    pct:
      generalTotals.need > 0
        ? Math.min(100, Math.round((generalTotals.assigned / generalTotals.need) * 100))
        : 0,
  };
}
