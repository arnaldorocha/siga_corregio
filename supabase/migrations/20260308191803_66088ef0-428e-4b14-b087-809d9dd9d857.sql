
-- Table to link professors to their turmas
CREATE TABLE public.professor_turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, turma_id)
);

ALTER TABLE public.professor_turmas ENABLE ROW LEVEL SECURITY;

-- Admin can manage all professor_turmas
CREATE POLICY "admin_manage_prof_turmas" ON public.professor_turmas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Professors can read their own assignments
CREATE POLICY "prof_read_own_turmas" ON public.professor_turmas
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Coordenacao can manage
CREATE POLICY "coord_manage_prof_turmas" ON public.professor_turmas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coordenacao'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordenacao'::app_role));
