import { useAuth } from "@/_core/hooks/useAuth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PageShell } from "@/components/zts/PageShell";
import { HOME_PATH } from "@/const";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission, requiredPermissionFor } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { DashboardSidebar } from "./DashboardSidebar";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

function AccessDenied() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 sm:py-24 text-center px-4">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Seu perfil não tem permissão para acessar esta página. Fale com um administrador.
      </p>
      <Button variant="outline" onClick={() => setLocation("/dashboard")}>
        Voltar ao dashboard
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
      className="flex-1 min-w-0 px-3 py-4 sm:px-5 sm:py-6 md:px-6"
    >
      <PageShell>{allowed ? children : <AccessDenied />}</PageShell>
    </motion.main>
  );
}

/** Shell ZTS Cell: drawer no mobile, sidebar no desktop; conteúdo com largura máxima. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading, user, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: HOME_PATH,
  });

  if (loading || !user) return <DashboardLayoutSkeleton />;

  const handleLogout = async () => {
    await logout();
    window.location.href = HOME_PATH;
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16.5rem",
          "--sidebar-width-mobile": "19rem",
          "--sidebar-width-icon": "3.75rem",
        } as CSSProperties
      }
    >
      <DashboardSidebar onLogout={handleLogout} />
      <SidebarInset className="bg-background min-w-0 overflow-x-hidden">
        {/* Só no mobile: abrir menu. Desktop usa o logo na sidebar. Sem título de página. */}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-card/95 backdrop-blur-sm px-2 md:hidden supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <SidebarTrigger className="h-9 w-9 rounded-sm shrink-0" />
          <span className="text-sm font-medium truncate">ZTS Cell</span>
        </header>
        <Content>{children}</Content>
      </SidebarInset>
    </SidebarProvider>
  );
}
