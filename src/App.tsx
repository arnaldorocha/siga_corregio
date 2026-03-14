import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Turmas from "@/pages/Turmas";
import Cursos from "@/pages/Cursos";
import Modulos from "@/pages/Modulos";
import Alunos from "@/pages/Alunos";
import Matriculas from "@/pages/Matriculas";
import Frequencia from "@/pages/Frequencia";
import Relatorios from "@/pages/Relatorios";
import Timeline from "@/pages/Timeline";
import Usuarios from "@/pages/Usuarios";
import Notificacoes from "@/pages/Notificacoes";
import Configuracoes from "@/pages/Configuracoes";
import ImportacaoDados from "@/pages/ImportacaoDados";
import Rematriculas from "@/pages/Rematriculas";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/turmas" element={<Turmas />} />
      <Route path="/cursos" element={<Cursos />} />
      <Route path="/modulos" element={<Modulos />} />
      <Route path="/alunos" element={<Alunos />} />
      <Route path="/matriculas" element={<Matriculas />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/frequencia" element={<Frequencia />} />
      <Route path="/relatorios" element={<Relatorios />} />
      <Route path="/usuarios" element={<Usuarios />} />
      <Route path="/notificacoes" element={<Notificacoes />} />
      <Route path="/configuracoes" element={<Configuracoes />} />
      <Route path="/importacao" element={<ImportacaoDados />} />
      <Route path="/rematriculas" element={<Rematriculas />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
