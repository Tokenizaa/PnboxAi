-- pnbox_credentials: credenciais de conexão PNBOX por usuário da plataforma
-- Guardadas no banco (não no frontend), vinculadas a auth.users.
CREATE TABLE pnbox_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf text,
  password text,
  id_plano text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER pnbox_credentials_updated_at BEFORE UPDATE ON pnbox_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE pnbox_credentials ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado acessa apenas as próprias credenciais
CREATE POLICY "pnbox_credentials_own_all" ON pnbox_credentials
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role (usado pelo servidor para operações administrativas/auto-reconnect)
CREATE POLICY "pnbox_credentials_service_all" ON pnbox_credentials
  FOR ALL TO service_role
  WITH CHECK (true);
