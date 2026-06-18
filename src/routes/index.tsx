import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { AppShell, type TabKey } from "@/components/app-shell";
import { PassphraseProvider } from "@/components/passphrase-dialog";
import { CascadeDeleteProvider } from "@/components/cascade-delete-dialog";
import { CasasSection } from "@/sections/casas";
import { ConfigSection } from "@/sections/config";
import { DashboardSection } from "@/sections/dashboard";
import { DeliveriesSection } from "@/sections/deliveries";
import { InventorySection } from "@/sections/inventory";
import { MaterialsSection } from "@/sections/materials";
import { ReceptionsSection } from "@/sections/receptions";
import { ReportsSection } from "@/sections/reports";
import { PlanoSection } from "@/sections/plano";
import { useConfig } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Control de obra" },
      {
        name: "description",
        content:
          "Control de avance por sitio y vale tipo: matriz de 102 casas, entregas manuales y auto-completado.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<TabKey>("plano");
  const cfg = useConfig();

  return (
    <>
      <AppShell active={tab} onChange={setTab} projectName={cfg.data?.name ?? "Mi Obra"}>
        {tab === "plano" && <PlanoSection />}
        {tab === "dashboard" && <DashboardSection />}
        {tab === "recepciones" && <ReceptionsSection />}
        {tab === "entregas" && <DeliveriesSection />}
        {tab === "inventario" && <InventorySection />}
        {tab === "casas" && <CasasSection />}
        {tab === "materiales" && <MaterialsSection />}
        {tab === "reportes" && <ReportsSection />}
        {tab === "config" && <ConfigSection />}
      </AppShell>
      <PassphraseProvider />
      <Toaster
        richColors
        position="top-center"
        expand
        visibleToasts={5}
        toastOptions={{
          classNames: {
            toast:
              "!w-[min(92vw,520px)] !p-5 !rounded-2xl !border-2 !shadow-2xl !text-base !font-medium",
            title: "!text-base sm:!text-lg !font-semibold",
            description: "!text-sm sm:!text-base",
            error: "!bg-destructive !text-destructive-foreground !border-destructive",
          },
          style: {
            // Centrado vertical en pantalla, encima de cualquier diálogo
            // (sonner posiciona top-center; lo bajamos al centro vertical)
          },
        }}
        offset="45vh"
      />
    </>
  );
}

