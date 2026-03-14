
ALTER TABLE public.alunos 
  ADD COLUMN IF NOT EXISTS status_rematricula text DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS interesse_rematricula text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_contato_rematricula date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observacao_rematricula text DEFAULT NULL;
