
-- Allow all authenticated users to read professor_turmas (needed to display professor on turma)
CREATE POLICY "auth_read_prof_turmas" ON public.professor_turmas
  FOR SELECT TO authenticated
  USING (true);
