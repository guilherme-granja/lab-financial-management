CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
$$;

CREATE POLICY "Admins veem todos os perfis" ON profiles FOR SELECT USING (public.current_user_is_admin());
CREATE POLICY "Admins atualizam qualquer perfil" ON profiles FOR UPDATE USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins inserem perfil" ON profiles FOR INSERT WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins veem todas as configuracoes de banco" ON user_databases FOR SELECT USING (public.current_user_is_admin());
CREATE POLICY "Admins atualizam qualquer banco" ON user_databases FOR UPDATE USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "Admins inserem banco de usuario" ON user_databases FOR INSERT WITH CHECK (public.current_user_is_admin());
