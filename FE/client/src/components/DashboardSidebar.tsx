import { usePermissions } from "@/hooks/usePermissions";
import { ALL_NAV_ITEMS, NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { ZtsLogo } from "./zts/ZtsLogo";

/** Item ativo = maior prefixo de rota; /dashboard só casa exato. */
export function findActiveItem(location: string): NavItem | undefined {
  return ALL_NAV_ITEMS.filter(i => !i.external)
    .filter(i =>
      i.path === "/dashboard"
        ? location === i.path
        : location === i.path || location.startsWith(`${i.path}/`)
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
}

export function DashboardSidebar({ onLogout }: { onLogout: () => void }) {
  const [location, setLocation] = useLocation();
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { canAccess, user, employee } = usePermissions();

  const groups = useMemo(
    () =>
      NAV_GROUPS.map(group => ({
        ...group,
        items: group.items.filter(item => item.external || canAccess(item.path)),
      })).filter(group => group.items.length > 0),
    [canAccess]
  );

  const active = findActiveItem(location);

  const go = (path: string, external?: boolean) => {
    if (external) {
      window.open(path, "_blank", "noopener");
      return;
    }
    setLocation(path);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border group-data-[collapsible=icon]:pr-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="w-full rounded-sm px-1.5 py-1 text-left transition-colors hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ZtsLogo tone="light" subtitle="Assistência técnica" collapsed={collapsed} />
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2 overscroll-contain group-data-[collapsible=icon]:pr-2">
        {groups.map(group => (
          <SidebarGroup key={group.label || group.items[0]?.path} className="py-1.5">
            {group.label ? (
              <SidebarGroupLabel className="text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/50 px-3">
                {group.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarMenu className="gap-0.5 px-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
              {group.items.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={active?.path === item.path}
                    tooltip={item.label}
                    className={
                      item.pinned
                        ? "h-10 sm:h-9 rounded-sm font-semibold bg-[#e8eef4] text-[#1a1f26] hover:bg-white hover:text-[#1a1f26] data-[active=true]:bg-white data-[active=true]:text-[#1a1f26] shadow-sm"
                        : "h-10 sm:h-9 rounded-sm font-normal data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary data-[active=true]:font-medium"
                    }
                    onClick={() => go(item.path, item.external)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border pb-[max(0.5rem,env(safe-area-inset-bottom))] group-data-[collapsible=icon]:pr-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-sm px-1.5 py-2 hover:bg-sidebar-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
              <Avatar className="h-9 w-9 rounded-sm shrink-0">
                <AvatarFallback className="rounded-sm text-xs bg-sidebar-accent text-sidebar-accent-foreground">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate leading-none text-sidebar-accent-foreground">
                  {user?.name || "-"}
                </p>
                <p className="text-[0.6875rem] text-sidebar-foreground/60 truncate mt-1">
                  {employee?.profile?.name ?? user?.email ?? "-"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={onLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
