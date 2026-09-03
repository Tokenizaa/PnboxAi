-- Executions tables
CREATE TABLE executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES pnbox_collections(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  status execution_status NOT NULL DEFAULT 'pending',
  configuracao jsonb NOT NULL DEFAULT '{}',
  resultado jsonb,
  erro text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE execution_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  ferramenta pnbox_tool NOT NULL,
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb,
  status execution_status NOT NULL DEFAULT 'pending',
  erro text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  acao audit_action NOT NULL,
  recurso text NOT NULL,
  recurso_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Updated at triggers
CREATE TRIGGER executions_updated_at BEFORE UPDATE ON executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER execution_items_updated_at BEFORE UPDATE ON execution_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();