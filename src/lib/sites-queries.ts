import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  MaterialV2,
  Site,
  SiteDelivery,
  SiteDeliveryItem,
  ValeReq,
  ValeStage,
  ValeTypeV2,
} from "./sites-types";

export const sqk = {
  sites: ["v2", "sites"] as const,
  valeTypes: ["v2", "vale_types"] as const,
  valeStages: ["v2", "vale_stages"] as const,
  materials: ["v2", "materials"] as const,
  valeReqs: ["v2", "vale_reqs"] as const,
  siteDeliveries: ["v2", "site_deliveries"] as const,
  siteDeliveryItems: ["v2", "site_delivery_items"] as const,
};

async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table as never).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export const useSites = () =>
  useQuery({ queryKey: sqk.sites, queryFn: () => fetchAll<Site>("sites") });

export const useValeTypes = () =>
  useQuery({
    queryKey: sqk.valeTypes,
    queryFn: () => fetchAll<ValeTypeV2>("vale_types_v2"),
  });

export const useValeStages = () =>
  useQuery({
    queryKey: sqk.valeStages,
    queryFn: () => fetchAll<ValeStage>("vale_stages"),
  });

export const useMaterialsV2 = () =>
  useQuery({
    queryKey: sqk.materials,
    queryFn: () => fetchAll<MaterialV2>("materials_v2"),
  });

export const useValeReqs = () =>
  useQuery({
    queryKey: sqk.valeReqs,
    queryFn: () => fetchAll<ValeReq>("vale_reqs"),
  });

export const useSiteDeliveries = () =>
  useQuery({
    queryKey: sqk.siteDeliveries,
    queryFn: () => fetchAll<SiteDelivery>("site_deliveries"),
  });

export const useSiteDeliveryItems = () =>
  useQuery({
    queryKey: sqk.siteDeliveryItems,
    queryFn: () => fetchAll<SiteDeliveryItem>("site_delivery_items"),
  });

export function useInvalidateSitesV2() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["v2"] });
  };
}
