import { useAuth } from "@/_core/hooks/useAuth";
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
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl, TECHXAP_LOGO, APP_NAME } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, LogOut, PanelLeft, Upload, Settings, Home, AlertTriangle, AlertCircle, FileText, TrendingUp, Shield, Trash2 } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  module?: "operacional_jornada" | "controle_de_advertencias";
};

const menuItems: MenuItem[] = [
  // Módulo: Operacional Jornada
  { icon: Home, label: "Hoje", path: "/", module: "operacional_jornada" },
  { icon: BarChart3, label: "Semana", path: "/semana", module: "operacional_jornada" },
  { icon: Upload, label: "Importação", path: "/importacao", module: "operacional_jornada" },
  
  // Módulo: Controle de Advertências
  { icon: AlertTriangle, label: "Cadastro de Advertências", path: "/reincidentes", module: "controle_de_advertencias" },
  { icon: AlertCircle, label: "Gerenciamento de Advertências", path: "/advertencias", module: "controle_de_advertencias" },
  { icon: TrendingUp, label: "Acompanhamento", path: "/acompanhamento", module: "controle_de_advertencias" },
  { icon: FileText, label: "Relatórios", path: "/relatorios", module: "controle_de_advertencias" },
  
  // Admin
  { icon: Shield, label: "Auditoria", path: "/auditoria" },
  { icon: Trash2, label: "Retenção de Dados", path: "/retenção-dados" },
  
  // Configurações
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

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
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-gray-900">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <img src={TECHXAP_LOGO} alt="TechXap" className="h-16 w-auto" />
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {APP_NAME}
              </h1>
              <p className="text-sm text-yellow-400 mt-2">
                Dashboard Operacional de Motoristas
              </p>
            </div>
            <p className="text-sm text-gray-400 text-center max-w-sm">
              Faça login com sua conta Google para acessar o dashboard.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all bg-yellow-500 text-black hover:bg-yellow-600"
          >
            Entrar com Google
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Filtrar itens de menu baseado nos módulos do usuário
  const getFilteredMenuItems = () => {
    if (!user) return [];
    
    // Se é admin, mostrar todos os itens
    if (user.role === 'admin') return menuItems;
    
    // Se é usuário comum, filtrar por módulos
    const userModules = user.modules ? JSON.parse(user.modules) : [];
    return menuItems.filter(item => {
      // Configurações sempre visível
      if (item.path === '/configuracoes') return true;
      // Filtrar por módulo
      if (!item.module) return true;
      return userModules.includes(item.module);
    });
  };

  const filteredMenuItems = getFilteredMenuItems();
  const activeMenuItem = filteredMenuItems.find(item => item.path === location);

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

  const renderMenuSection = (title: string, items: MenuItem[]) => {
    const visibleItems = items.filter(item => filteredMenuItems.some(m => m.path === item.path));
    
    if (visibleItems.length === 0) return null;

    return (
      <div className="px-2 py-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {title}
        </div>
        <SidebarMenu className="gap-1">
          {visibleItems.map(item => {
            const isActive = location === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => setLocation(item.path)}
                  tooltip={item.label}
                  className={`h-10 transition-all font-normal ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </div>
    );
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-gradient-to-b from-slate-900 to-slate-800"
        >
          <SidebarHeader className="h-16 justify-center border-b border-slate-700">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-slate-300" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/framento_logo.webp" alt="Framento" className="h-8 w-auto" />
                  <div className="flex flex-col">
                    <span className="font-bold tracking-tight truncate text-white text-sm leading-tight">
                      Ociosidade
                    </span>
                    <span className="text-xs text-slate-400">
                      BRF Primária
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 flex flex-col">
            {renderMenuSection(
              "Operacional Jornada",
              menuItems.filter(item => item.module === "operacional_jornada")
            )}
            
            {filteredMenuItems.some(item => item.module === "operacional_jornada") && 
             filteredMenuItems.some(item => item.module === "controle_de_advertencias") && (
              <div className="border-t border-slate-700" />
            )}
            
            {renderMenuSection(
              "Controle de Advertências",
              menuItems.filter(item => item.module === "controle_de_advertencias")
            )}
            
            <div className="border-t border-slate-700 mt-auto" />
            
            {renderMenuSection(
              "Outros",
              menuItems.filter(item => !item.module)
            )}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-slate-700">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-700 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <Avatar className="h-9 w-9 border border-slate-600 shrink-0 bg-blue-600">
                    <AvatarFallback className="text-xs font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
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
        <main className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100">{children}</main>
      </SidebarInset>
    </>
  );
}
