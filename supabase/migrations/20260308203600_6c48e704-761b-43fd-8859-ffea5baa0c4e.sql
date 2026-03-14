
CREATE TABLE public.controle_faltantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_nome text NOT NULL,
  faltas integer NOT NULL DEFAULT 0,
  recorrencias integer NOT NULL DEFAULT 0,
  casos_adm integer NOT NULL DEFAULT 0,
  curso text,
  turma_codigo text,
  observacoes text,
  dia_semana text,
  data_referencia date,
  professor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.controle_faltantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_faltantes" ON public.controle_faltantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_coord_insert_faltantes" ON public.controle_faltantes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_update_faltantes" ON public.controle_faltantes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenacao'));
CREATE POLICY "admin_coord_delete_faltantes" ON public.controle_faltantes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordenacao'));
