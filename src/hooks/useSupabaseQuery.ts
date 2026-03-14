import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type TableName = "turmas" | "cursos" | "modulos" | "alunos" | "matriculas" | "progresso_modulos" | "frequencias" | "notificacoes" | "professor_turmas" | "user_roles" | "profiles";

export function useTable<T = any>(table: TableName, options?: { select?: string; order?: { column: string; ascending?: boolean } }) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      let query = supabase.from(table).select(options?.select || "*");
      if (options?.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },
  });
}

export function useInsert(table: TableName) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await supabase.from(table).insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast({ title: "Registro criado com sucesso!" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
  });
}

export function useUpdate(table: TableName) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { data, error } = await supabase.from(table).update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast({ title: "Registro atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });
}

export function useDelete(table: TableName) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast({ title: "Registro removido!" });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });
}
