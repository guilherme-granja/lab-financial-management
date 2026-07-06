-- Permite que admins leiam todos os profiles
CREATE POLICY "Admins veem todos os perfis"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Permite que admins leiam todas as user_databases
CREATE POLICY "Admins veem todas as configuracoes de banco"
  ON user_databases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Permite que admins atualizem qualquer user_databases (para toggleActive, markMigrated)
CREATE POLICY "Admins atualizam qualquer banco"
  ON user_databases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Permite que admins atualizem qualquer profile (para toggleActive)
CREATE POLICY "Admins atualizam qualquer perfil"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Permite que admins insiram em user_databases (para createUser via hook)
CREATE POLICY "Admins inserem banco de usuario"
  ON user_databases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Permite que admins insiram profiles (para createUser via hook)
CREATE POLICY "Admins inserem perfil"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );
