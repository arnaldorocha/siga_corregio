-- Update aluno status options to include Cancelado and Finalizado
ALTER TABLE public.alunos DROP CONSTRAINT IF EXISTS alunos_status_check;
ALTER TABLE public.alunos ADD CONSTRAINT alunos_status_check CHECK (status IN ('Ativo', 'Inativo', 'Trancado', 'Cancelado', 'Finalizado'));