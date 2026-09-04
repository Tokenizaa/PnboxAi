-- pnbox_credentials: credenciais de conexão PNBOX por usuário da plataforma
-- Guardadas no banco (não no frontend), vinculadas a auth.users.
-- Senha armazenada criptografada (AES-GCM) - chave derivada de segredo do servidor
CREATE TABLE pnbox_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf text,
  password_enc text,          -- Senha criptografada (base64: iv:authTag:ciphertext)
  id_plano text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER pnbox_credentials_updated_at BEFORE UPDATE ON pnbox_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pnbox_credentials ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado acessa apenas as próprias credenciais (NÃO retorna password_enc)
CREATE POLICY "pnbox_credentials_own_select" ON pnbox_credentials
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pnbox_credentials_own_upsert" ON pnbox_credentials
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "pnbox_credentials_own_update" ON pnbox_credentials
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "pnbox_credentials_own_delete" ON pnbox_credentials
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Service role (usado pelo servidor para operações administrativas/auto-reconnect)
-- Acesso total para auto-reconnect, mas nunca retorna password_enc via API
CREATE POLICY "pnbox_credentials_service_all" ON pnbox_credentials
  FOR ALL TO service_role
  WITH CHECK (true);
