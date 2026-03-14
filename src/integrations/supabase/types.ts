export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          created_at: string
          curso_indicado: string | null
          data_contato_rematricula: string | null
          data_nascimento: string | null
          email: string | null
          id: string
          interesse_rematricula: string | null
          modalidade: string | null
          nome: string
          observacao_rematricula: string | null
          status: string
          status_rematricula: string | null
          telefone: string | null
          telefone_responsavel: string | null
          tipo_aluno: string | null
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          curso_indicado?: string | null
          data_contato_rematricula?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          interesse_rematricula?: string | null
          modalidade?: string | null
          nome: string
          observacao_rematricula?: string | null
          status?: string
          status_rematricula?: string | null
          telefone?: string | null
          telefone_responsavel?: string | null
          tipo_aluno?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          curso_indicado?: string | null
          data_contato_rematricula?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          interesse_rematricula?: string | null
          modalidade?: string | null
          nome?: string
          observacao_rematricula?: string | null
          status?: string
          status_rematricula?: string | null
          telefone?: string | null
          telefone_responsavel?: string | null
          tipo_aluno?: string | null
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_faltantes: {
        Row: {
          aluno_nome: string
          casos_adm: number
          created_at: string
          curso: string | null
          data_referencia: string | null
          dia_semana: string | null
          faltas: number
          id: string
          observacoes: string | null
          professor: string | null
          recorrencias: number
          turma_codigo: string | null
        }
        Insert: {
          aluno_nome: string
          casos_adm?: number
          created_at?: string
          curso?: string | null
          data_referencia?: string | null
          dia_semana?: string | null
          faltas?: number
          id?: string
          observacoes?: string | null
          professor?: string | null
          recorrencias?: number
          turma_codigo?: string | null
        }
        Update: {
          aluno_nome?: string
          casos_adm?: number
          created_at?: string
          curso?: string | null
          data_referencia?: string | null
          dia_semana?: string | null
          faltas?: number
          id?: string
          observacoes?: string | null
          professor?: string | null
          recorrencias?: number
          turma_codigo?: string | null
        }
        Relationships: []
      }
      cursos: {
        Row: {
          ativo: boolean
          carga_horaria_total: number
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          carga_horaria_total: number
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          carga_horaria_total?: number
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      frequencias: {
        Row: {
          created_at: string
          data: string
          id: string
          matricula_id: string
          motivo: string | null
          presente: boolean
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          matricula_id: string
          motivo?: string | null
          presente?: boolean
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          matricula_id?: string
          motivo?: string | null
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "frequencias_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          aluno_id: string
          created_at: string
          curso_id: string
          data_inicio: string
          id: string
          matricula_anterior_id: string | null
          status: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          curso_id: string
          data_inicio?: string
          id?: string
          matricula_anterior_id?: string | null
          status?: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          curso_id?: string
          data_inicio?: string
          id?: string
          matricula_anterior_id?: string | null
          status?: string
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_matricula_anterior_id_fkey"
            columns: ["matricula_anterior_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          carga_horaria: number
          created_at: string
          curso_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          carga_horaria: number
          created_at?: string
          curso_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          carga_horaria?: number
          created_at?: string
          curso_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          data: string
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      professor_turmas: {
        Row: {
          created_at: string
          id: string
          turma_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          turma_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          turma_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_turmas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progresso_modulos: {
        Row: {
          created_at: string
          data_inicio: string
          data_previsao_termino: string
          data_real_termino: string | null
          id: string
          matricula_id: string
          modulo_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_inicio: string
          data_previsao_termino: string
          data_real_termino?: string | null
          id?: string
          matricula_id: string
          modulo_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_inicio?: string
          data_previsao_termino?: string
          data_real_termino?: string | null
          id?: string
          matricula_id?: string
          modulo_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progresso_modulos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano: number
          capacidade_maxima: number
          created_at: string
          dia_semana: string | null
          horario: string | null
          id: string
          nome: string
          status: string
          turno: string
          updated_at: string
        }
        Insert: {
          ano?: number
          capacidade_maxima?: number
          created_at?: string
          dia_semana?: string | null
          horario?: string | null
          id?: string
          nome: string
          status?: string
          turno: string
          updated_at?: string
        }
        Update: {
          ano?: number
          capacidade_maxima?: number
          created_at?: string
          dia_semana?: string | null
          horario?: string | null
          id?: string
          nome?: string
          status?: string
          turno?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordenacao" | "professor" | "financeiro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coordenacao", "professor", "financeiro"],
    },
  },
} as const
