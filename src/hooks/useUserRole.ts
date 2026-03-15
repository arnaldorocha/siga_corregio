import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "coordenacao" | "professor" | "financeiro";

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const userRoles = (data || []).map((r: any) => r.role as AppRole);
        setRoles(userRoles);
        setLoading(false);
      });
  }, [user]);

  const hasRole = (...r: AppRole[]) => r.some((role) => roles.includes(role));
  const isAdmin = roles.includes("admin");
  const canEdit = roles.includes("admin") || roles.includes("coordenacao");
  const canManageFrequencia = roles.includes("admin") || roles.includes("coordenacao") || roles.includes("professor");
  const isProfessor = roles.includes("professor");

  return { roles, loading, hasRole, isAdmin, canEdit, canManageFrequencia, isProfessor };
}

export function useProfessorTurmas() {
  const { user } = useAuth();
  const [turmaIds, setTurmaIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { isAdmin, canEdit, isProfessor } = useUserRole();

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    if (isAdmin || canEdit) {
      setTurmaIds([]);
      setLoaded(true);
      return;
    }
    supabase
      .from("professor_turmas")
      .select("turma_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setTurmaIds((data || []).map((r: any) => r.turma_id));
        setLoaded(true);
      });
  }, [user, isAdmin, canEdit]);

  const filterAll = isAdmin || canEdit;

  // Helper to filter any array by turma_id
  const filterByTurma = <T extends Record<string, any>>(items: T[], turmaKey = "turma_id"): T[] => {
    if (filterAll) return items;
    // If professor has specific turmas assigned, filter by them
    if (turmaIds.length > 0) {
      return items.filter((item) => turmaIds.includes(item[turmaKey]));
    }
    // If professor has no specific turmas assigned, show all (fallback)
    return items;
  };

  return { turmaIds, filterAll, loaded, filterByTurma, isProfessor };
}
