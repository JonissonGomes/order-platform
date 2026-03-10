import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { LOGIN_PATH } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LogOut, PanelLeft, AlertTriangle, PhoneCall } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { MODULES } from "@/types/modules";
import * as Icons from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Employee } from "@/types";
import { permissionMatchesModule } from "@/lib/permission-mapper";

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, isSuspended } = useAuth();
  
  // Check if user is admin/dono
  const isAdmin = user?.role === "dono" || user?.role === "super_admin" || user?.role === "admin";

  // Get employee data to find profile
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ["employee", user?.id],
    queryFn: async () => {
      if (!user?.id || isAdmin) return null;
      try {
        const employees = await api.listEmployees();
        return employees.employees?.find((e: Employee) => e.userId === user.id) || null;
      } catch (error) {
        console.error("Error fetching employee data:", error);
        return null;
      }
    },
    enabled: !isAdmin && !!user?.id,
    retry: 1,
  });

  // Map role to profile name - works for all roles
  const getProfileName = (): string | null => {
    if (user?.role === "dono" || user?.role === "super_admin") {
      return "Dono";
    }
    if (user?.role === "admin") {
      return "Administrador";
    }
    // For non-admin users, try to get role from employeeData
    if (employeeData?.role) {
      const roleMap: Record<string, string> = {
        "admin": "Administrador",
        "department_manager": "Gerente",
        "attendant": "Atendente",
        "technician": "Técnico",
        "user": "User", // Cliente
      };
      return roleMap[employeeData.role] || null;
    }
    // If employeeData is not found but user has role "user", it might be a customer
    if (user?.role === "user" && !isLoadingEmployee) {
      return "User";
    }
    return null;
  };

  const profileName = getProfileName();

  // Get profile permissions from database
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile", profileName],
    queryFn: async () => {
      if (!profileName) return null;
      try {
        return await api.getProfileByName(profileName);
      } catch (error) {
        console.error(`Error fetching profile "${profileName}":`, error);
        return null;
      }
    },
    enabled: !isAdmin && !!profileName,
    retry: 1,
  });

  // Get visible modules based on actual profile permissions
  const visibleModules = useMemo(() => {
    if (!user?.role) return [];
    
    // If admin/dono, show all modules
    if (isAdmin) {
      return MODULES;
    }

    // If we're still loading employee data, wait
    if (isLoadingEmployee && !employeeData) {
      return []; // Still loading
    }

    // If we have a profileName but profile is still loading, wait
    if (profileName && isLoadingProfile) {
      return []; // Still loading profile
    }

    // If we have a profileName but no profile was found, return empty (profile doesn't exist)
    if (profileName && !profile?.profile) {
      console.warn(`Profile "${profileName}" not found in database`);
      return []; // Profile not found
    }

    // If we don't have a profileName yet and we're not loading, user might not have a profile
    if (!profileName && !isLoadingEmployee) {
      console.warn(`No profile name found for user role: ${user.role}`);
      return []; // No profile mapping found
    }

    // If no profile found and we're not admin, return empty
    if (!profile?.profile) {
      return []; // Profile not found
    }

    // Filter modules based on actual profile permissions
    const userPermissions = profile.profile.permissions || [];
    const filtered = MODULES.filter((module) => {
      // Check if user has any of the required permissions for this module
      // First check if user has wildcard permission
      if (userPermissions.includes("*")) {
        return true;
      }
      
      // Check each module permission against user permissions
      return module.permissions.some((modulePerm) => {
        // Check if any user permission matches this module permission
        return userPermissions.some((userPerm) => {
          // Direct match
          if (userPerm === modulePerm) return true;
          
          // Wildcard match (user has "service_orders.*" and module needs "service_orders.read")
          if (userPerm.endsWith(".*")) {
            const userPrefix = userPerm.slice(0, -2);
            if (modulePerm.startsWith(userPrefix + ".")) return true;
          }
          
          // Module path match (user has "service_orders.read" and module path is "/service-orders")
          if (permissionMatchesModule(userPerm, module.path)) return true;
          
          return false;
        });
      });
    });

    console.log(`[DashboardLayout] User: ${user?.email}, Profile: ${profileName}, Permissions:`, userPermissions, "Visible modules:", filtered.map(m => m.path));
    return filtered;
  }, [user?.role, isAdmin, profile?.profile, profileName, profile, employeeData, isLoadingEmployee, isLoadingProfile]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (isSuspended) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <div className="p-5 rounded-full bg-destructive/10">
            <AlertTriangle className="h-14 w-14 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Conta Suspensa</h1>
            <p className="text-muted-foreground">
              Sua conta foi suspensa e você não possui acesso ao sistema no momento.
            </p>
          </div>
          <div className="w-full rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 justify-center font-medium text-foreground">
              <PhoneCall className="h-4 w-4" />
              <span>Entre em contato com o RH</span>
            </div>
            <p>Para reativar o seu acesso, entre em contato com o time de Gestão de Pessoas ou o seu gestor responsável.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => { window.location.href = LOGIN_PATH; }}
            className="w-full"
          >
            Voltar para o Login
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Faça login para continuar
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              O acesso ao painel requer autenticação. Clique abaixo para fazer login.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = LOGIN_PATH;
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Reuse the same permission logic
  const isAdmin = user?.role === "dono" || user?.role === "super_admin" || user?.role === "admin";

  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ["employee", user?.id],
    queryFn: async () => {
      if (!user?.id || isAdmin) return null;
      try {
        const employees = await api.listEmployees();
        return employees.employees?.find((e: Employee) => e.userId === user.id) || null;
      } catch (error) {
        console.error("Error fetching employee data:", error);
        return null;
      }
    },
    enabled: !isAdmin && !!user?.id,
    retry: 1,
  });

  const getProfileName = (): string | null => {
    if (user?.role === "dono" || user?.role === "super_admin") return "Dono";
    if (user?.role === "admin") return "Administrador";
    if (employeeData?.role) {
      const roleMap: Record<string, string> = {
        "admin": "Administrador",
        "department_manager": "Gerente",
        "attendant": "Atendente",
        "technician": "Técnico",
        "user": "User",
      };
      return roleMap[employeeData.role] || null;
    }
    if (user?.role === "user" && !isLoadingEmployee) {
      return "User";
    }
    return null;
  };

  const profileName = getProfileName();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile", profileName],
    queryFn: async () => {
      if (!profileName) return null;
      try {
        return await api.getProfileByName(profileName);
      } catch (error) {
        console.error(`Error fetching profile "${profileName}":`, error);
        return null;
      }
    },
    enabled: !isAdmin && !!profileName,
    retry: 1,
  });

  const visibleModules = useMemo(() => {
    if (!user?.role) return [];
    if (isAdmin) return MODULES;
    
    // If we're still loading employee data, wait
    if (isLoadingEmployee && !employeeData) {
      return []; // Still loading
    }

    // If we have a profileName but profile is still loading, wait
    if (profileName && isLoadingProfile) {
      return []; // Still loading profile
    }

    // If we have a profileName but no profile was found, return empty
    if (profileName && !profile?.profile) {
      console.warn(`Profile "${profileName}" not found in database`);
      return []; // Profile not found
    }

    // If we don't have a profileName yet and we're not loading, user might not have a profile
    if (!profileName && !isLoadingEmployee) {
      console.warn(`No profile name found for user role: ${user.role}`);
      return []; // No profile mapping found
    }

    // If no profile found and we're not admin, return empty
    if (!profile?.profile) {
      return []; // Profile not found
    }

    const userPermissions = profile.profile.permissions || [];
    const filtered = MODULES.filter((module) => {
      // Check if user has any of the required permissions for this module
      // First check if user has wildcard permission
      if (userPermissions.includes("*")) {
        return true;
      }
      
      // Check each module permission against user permissions
      return module.permissions.some((modulePerm) => {
        // Check if any user permission matches this module permission
        return userPermissions.some((userPerm) => {
          // Direct match
          if (userPerm === modulePerm) return true;
          
          // Wildcard match (user has "service_orders.*" and module needs "service_orders.read")
          if (userPerm.endsWith(".*")) {
            const userPrefix = userPerm.slice(0, -2);
            if (modulePerm.startsWith(userPrefix + ".")) return true;
          }
          
          // Module path match (user has "service_orders.read" and module path is "/service-orders")
          if (permissionMatchesModule(userPerm, module.path)) return true;
          
          return false;
        });
      });
    });

    console.log(`[DashboardLayoutContent] User: ${user?.email}, Profile: ${profileName}, Permissions:`, userPermissions, "Visible modules:", filtered.map(m => m.path));
    return filtered;
  }, [user?.role, isAdmin, profile?.profile, profileName, profile, employeeData, isLoadingEmployee, isLoadingProfile]);

  const activeMenuItem = visibleModules.find(module => module.path === location);

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    setLocation(LOGIN_PATH);
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {visibleModules.map(module => {
                const isActive = location === module.path;
                const IconComponent = (Icons as any)[module.icon] || Icons.LayoutDashboard;
                return (
                  <SidebarMenuItem key={module.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(module.path)}
                      tooltip={module.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <IconComponent
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{module.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className={`flex items-center gap-2 w-full ${isCollapsed ? "justify-center" : ""}`}>
              <button
                onClick={() => setLocation("/profile")}
                className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg transition-colors"
                title="Ver perfil"
              >
                <Avatar className="h-9 w-9 border cursor-pointer hover:opacity-80 transition-opacity">
                  <AvatarFallback className="text-xs font-medium">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <button
                    onClick={() => setLocation("/profile")}
                    className="flex-1 min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1 -ml-1 hover:bg-accent transition-colors"
                    title="Ver perfil"
                  >
                    <p className="text-sm font-medium truncate leading-none cursor-pointer">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5 cursor-pointer">
                      {user?.email || "-"}
                    </p>
                  </button>
                  <NotificationBell />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowLogoutDialog(true)}
                    className="shrink-0 h-9 w-9"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Sair</span>
                  </Button>
                </div>
              )}
              {isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLogoutDialog(true)}
                  className="shrink-0 h-9 w-9"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Sair</span>
                </Button>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 w-full min-w-0">{children}</main>
      </SidebarInset>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Saída</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair? Você será redirecionado para a página de login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
