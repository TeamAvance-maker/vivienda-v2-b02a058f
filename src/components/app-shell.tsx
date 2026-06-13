import { motion } from "framer-motion";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileSpreadsheet,
  Home,
  Layers,
  PackagePlus,
  Settings2,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export type TabKey =
  | "dashboard"
  | "recepciones"
  | "entregas"
  | "tipos"
  | "materiales"
  | "distribucion"
  | "inventario"
  | "reportes"
  | "config";

export const TABS: { key: TabKey; label: string; short: string; icon: typeof Home }[] = [
  { key: "dashboard", label: "Inicio", short: "Inicio", icon: Home },
  { key: "recepciones", label: "Recepciones", short: "Recep.", icon: PackagePlus },
  { key: "entregas", label: "Entregas", short: "Entrega", icon: Truck },
  { key: "inventario", label: "Inventario", short: "Conteo", icon: ClipboardCheck },
  { key: "tipos", label: "Tipos vivienda", short: "Tipos", icon: Layers },
  { key: "materiales", label: "Materiales", short: "Materia.", icon: Boxes },
  { key: "distribucion", label: "Distribución", short: "Distrib.", icon: BarChart3 },
  { key: "reportes", label: "Reportes", short: "Report.", icon: FileSpreadsheet },
  { key: "config", label: "Configuración", short: "Config.", icon: Settings2 },
];

export function AppShell({
  active,
  onChange,
  projectName,
  children,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  projectName: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Control de obra
            </div>
            <div className="truncate font-display text-lg font-semibold leading-tight">
              {projectName || "Mi Obra"}
            </div>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden border-t border-border/60 md:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = active === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onChange(t.key)}
                  className={cn(
                    "group relative inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Content */}
      <motion.main
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
        className="mx-auto max-w-7xl px-4 pb-32 pt-6 md:px-6 md:pb-12"
      >
        {children}
      </motion.main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="flex overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                className={cn(
                  "flex min-w-[72px] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "scale-110 transition-transform")} />
                <span>{t.short}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
