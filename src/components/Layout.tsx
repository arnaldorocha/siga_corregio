import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTable } from "@/hooks/useSupabaseQuery";

export function Layout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: notificacoes } = useTable("notificacoes");
  const unread = notificacoes?.filter((n: any) => !n.lida).length || 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notificacoes')}>
                <Bell className="h-5 w-5" />
                {unread > 0 &&
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {unread}
                  </span>
                }
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-5 w-5" /></Button>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>);

}