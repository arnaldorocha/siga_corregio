import {
  LayoutDashboard, Users, BookOpen, Layers, GraduationCap,
  ClipboardList, CalendarCheck, FileBarChart, Bell, Settings, Clock, UserCog, FileSpreadsheet, RefreshCw,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const allMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: null },
  { title: "Turmas", url: "/turmas", icon: Users, roles: null },
  { title: "Cursos", url: "/cursos", icon: BookOpen, roles: null },
  { title: "Módulos", url: "/modulos", icon: Layers, roles: null },
  { title: "Alunos", url: "/alunos", icon: GraduationCap, roles: null },
  { title: "Meus Alunos", url: "/meus-alunos", icon: GraduationCap, roles: ["professor"] as string[] },
  { title: "Matrículas", url: "/matriculas", icon: ClipboardList, roles: null },
  { title: "Linha do Tempo", url: "/timeline", icon: Clock, roles: null },
  { title: "Frequência", url: "/frequencia", icon: CalendarCheck, roles: null },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart, roles: null },
  { title: "Rematrículas", url: "/rematriculas", icon: RefreshCw, roles: null },
  { title: "Importação de Dados", url: "/importacao", icon: FileSpreadsheet, roles: ["admin", "coordenacao"] as string[] },
  { title: "Usuários", url: "/usuarios", icon: UserCog, roles: ["admin"] as string[] },
  { title: "Notificações", url: "/notificacoes", icon: Bell, roles: null },
  { title: "Configurações", url: "/configuracoes", icon: Settings, roles: null },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { roles } = useUserRole();

  const menuItems = allMenuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((r) => roles.includes(r as any));
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`p-4 ${collapsed ? 'px-2' : ''}`}>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">SIGA</h2>
              <p className="text-[11px] text-sidebar-foreground/60 leading-tight">Sistema Integrado de Gestão Acadêmica</p>
            </div>
          )}
          {collapsed && <h2 className="text-center text-sm font-bold text-sidebar-primary-foreground">S</h2>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
