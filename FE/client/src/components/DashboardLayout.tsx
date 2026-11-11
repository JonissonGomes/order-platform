import { useAuth } from "@/_core/hooks/useAuth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { HOME_PATH } from "@/const";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission, requiredPermissionFor } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { DashboardSidebar, findActiveItem } from "./DashboardSidebar";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

function AccessDenied() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Seu perfil não tem permissão para acessar esta página. Fale com um administrador.
      </p>
      <Button variant="outline" onClick={() => setLocation("/dashboard")}>
        Voltar ao resumo
      </Button>
    </div>
  );
}

function Content({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { permissions } = usePermissions();
  const required = requiredPermissionFor(location);
  const allowed = required === undefined || required === null || hasPermission(permissions, required);

  return (
    <motion.main
      key={location}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex-1 p-4 md:p-6"
    >
      {allowed ? children : <AccessDenied />}
    </motion.main>
  );
}

/** Shell ZTS Cell: sidebar escura filtrada por permissão + área de conteúdo. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading, user, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: HOME_PATH,
  });
  const [location] = useLocation();

  if (loading || !user) return <DashboardLayoutSkeleton />;

  const activeLabel = findActiveItem(location)?.label ?? "ZTS Cell";

  const handleLogout = async () => {
    await logout();
    window.location.href = HOME_PATH;
  };

  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem" } as CSSProperties}>
      <DashboardSidebar onLogout={handleLogout} />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card px-3">
          <SidebarTrigger className="h-8 w-8 rounded-sm" />
          <span className="text-sm font-medium">{activeLabel}</span>
        </header>
        <Content>{children}</Content>
      </SidebarInset>
    </SidebarProvider>
  );
}
