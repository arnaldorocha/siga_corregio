
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS modalidade text DEFAULT 'Presencial';
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS tipo_aluno text DEFAULT 'Normal';
