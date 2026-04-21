import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
// getLoginUrl removed — using custom login page instead
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  Box,
  Calendar,
  ChevronDown,
  Cog,
  LayoutDashboard,
  LogOut,
  PackageMinus,
  PackagePlus,
  PanelLeft,
  Route,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "Fleet",
    items: [
      { icon: Truck, label: "Trucks", path: "/trucks" },
      { icon: Users, label: "Drivers", path: "/drivers" },
    ],
  },
  {
    label: "Fleet Operations",
    items: [
      { icon: Route, label: "Trips / Jobs", path: "/trips" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { icon: Box, label: "Parts Catalogue", path: "/parts" },
      { icon: PackagePlus, label: "Receive Stock", path: "/inventory" },
      { icon: PackageMinus, label: "Issue Parts", path: "/stock-removal" },
    ],
  },
  {
    label: "Maintenance",
    items: [
      { icon: Cog, label: "Suppliers", path: "/suppliers" },
      { icon: Wrench, label: "Maintenance Records", path: "/maintenance" },
      { icon: Calendar, label: "Service Schedules", path: "/schedules" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { icon: BarChart3, label: "Reports", path: "/reports" },
      { icon: ShoppingCart, label: "Parts Reorder", path: "/parts-reorder" },
    ],
  },
  {
    label: "Administration",
    items: [
      { icon: Shield, label: "Users", path: "/users" },
      { icon: ShieldCheck, label: "Audit Trail", path: "/audit-trail" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    // Redirect to custom login page
    window.location.replace("/login");
    return null;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Filter nav: Staff cannot see Users management
  const visibleNavGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.path === "/users") return user?.role === "admin";
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  const currentItem = visibleNavGroups.flatMap((g) => g.items).find((item) => {
    if (item.path === "/") return location === "/";
    return location.startsWith(item.path);
  });

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
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
        <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                    <Truck className="h-4 w-4 text-sidebar-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-sidebar-foreground truncate leading-none">FleetManager</p>
                    <p className="text-[10px] text-sidebar-foreground/50 truncate mt-0.5">Pro Edition</p>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="py-1 overflow-y-auto flex flex-col gap-0">
            {visibleNavGroups.map((group, groupIndex) => (
              <div key={group.label} className="flex flex-col">
                {!isCollapsed && groupIndex > 0 && (
                  <div className="mx-3 mt-1 mb-0 border-t border-sidebar-border/30" />
                )}
                {!isCollapsed && (
                  <div className={`px-3 ${groupIndex === 0 ? 'pt-1.5' : 'pt-1.5'} pb-0.5`}>
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/35 block">
                      {group.label}
                    </span>
                  </div>
                )}
                {isCollapsed && groupIndex > 0 && (
                  <div className="mx-3 my-1 border-t border-sidebar-border/30" />
                )}
                <SidebarMenu className="px-2 pb-0.5 gap-0">
                  {group.items.map((item) => {
                    const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
                    return (
                      <SidebarMenuItem key={item.path} className="py-0">
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-7 transition-all font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md ${
                            isActive ? "bg-sidebar-accent text-sidebar-foreground font-medium" : ""
                          }`}
                        >
                          <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                          <span className="truncate text-[13px]">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">{user?.name ?? "User"}</p>
                      <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-sidebar-border text-sidebar-foreground/60">
                          {user?.role === "admin" ? "Admin" : "Staff"}
                        </Badge>
                      </p>
                    </div>
                  )}
                  {!isCollapsed && <ChevronDown className="h-3 w-3 text-sidebar-foreground/40 shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => { await logout(); window.location.replace("/login"); }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors"
            onMouseDown={() => setIsResizing(true)}
            style={{ zIndex: 50 }}
          />
        )}
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-medium text-sm">{currentItem?.label ?? "Fleet Manager"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 min-h-screen bg-background">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
