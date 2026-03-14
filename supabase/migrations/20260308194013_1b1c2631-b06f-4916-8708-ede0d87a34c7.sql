
-- Allow admin to read all user_roles
CREATE POLICY "admin_read_all_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
