-- Ensure the entrega de resultados field exists so the app and scheduled function can safely use it.
-- This migration is safe to run multiple times (uses IF NOT EXISTS).

ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS data_entrega_resultados TIMESTAMPTZ;

-- Ensure the allowed status values include the new ones used in the UI.
ALTER TABLE public.alunos DROP CONSTRAINT IF EXISTS alunos_status_check;
ALTER TABLE public.alunos ADD CONSTRAINT alunos_status_check CHECK (status IN ('Ativo', 'Inativo', 'Trancado', 'Cancelado', 'Finalizado'));
