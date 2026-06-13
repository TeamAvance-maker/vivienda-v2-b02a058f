import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { AppShell, type TabKey } from "@/components/app-shell";
import { PassphraseProvider } from "@/components/passphrase-dialog";
import { ConfigSection } from "@/sections/config";
import { DashboardSection } from "@/sections/dashboard";
import { DeliveriesSection } from "@/sections/deliveries";
import { DistributionSection } from "@/sections/distribution";
import { HouseTypesSection } from "@/sections/house-types";
import { InventorySection } from "@/sections/inventory";
import { MaterialsSection } from "@/sections/materials";
import { ReceptionsSection } from "@/sections/receptions";
import { ReportsSection } from "@/sections/reports";
import { useConfig } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Control de obra" },
      {
        name: "description",
        content:
          "Control de puertas, cerraduras y ferretería para obra: stock, recepciones, entregas, inventario y alertas.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const cfg = useConfig();

  return (
    <>
      <AppShell active={tab} onChange={setTab} projectName={cfg.data?.name ?? "Mi Obra"}>
        {tab === "dashboard" && <DashboardSection />}
        {tab === "recepciones" && <ReceptionsSection />}
        {tab === "entregas" && <DeliveriesSection />}
        {tab === "inventario" && <InventorySection />}
        {tab === "tipos" && <HouseTypesSection />}
        {tab === "materiales" && <MaterialsSection />}
        {tab === "distribucion" && <DistributionSection />}
        {tab === "reportes" && <ReportsSection />}
        {tab === "config" && <ConfigSection />}
      </AppShell>
      <PassphraseProvider />
      <Toaster richColors position="top-center" />
    </>
  );
}
