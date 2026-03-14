
-- Allow all authenticated users to read profiles (display_name only via view would be ideal, but for now allow read)
DROP POLICY IF EXISTS "read_own_profile" ON public.profiles;
CREATE POLICY "auth_read_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
