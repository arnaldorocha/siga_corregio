
-- Fix permissive UPDATE policy on notificacoes - restrict to authenticated users only (marking as read)
DROP POLICY "admin_update_notificacoes" ON public.notificacoes;
CREATE POLICY "auth_update_notificacoes_lida" ON public.notificacoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
