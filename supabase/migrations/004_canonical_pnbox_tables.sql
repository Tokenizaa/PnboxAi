-- Canonical Business Model
CREATE TABLE canonical_business_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  segmento text,
  proposta_valor jsonb NOT NULL DEFAULT '{}',
  personas jsonb NOT NULL DEFAULT '[]',
  jornada_cliente jsonb NOT NULL DEFAULT '[]',
  canais jsonb NOT NULL DEFAULT '[]',
  estrutura_custos jsonb NOT NULL DEFAULT '{}',
  fontes_receita jsonb NOT NULL DEFAULT '{}',
  metricas_chave jsonb NOT NULL DEFAULT '{}',
  analise_swot jsonb,
  modelo_canvas jsonb,
  versao int NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PNBOX tables
CREATE TABLE pnbox_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  canonical_model_id uuid REFERENCES canonical_business_models(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'draft',
  progresso jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pnbox_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES pnbox_collections(id) ON DELETE CASCADE,
  ferramenta pnbox_tool NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  dados jsonb NOT NULL DEFAULT '{}',
  validado boolean NOT NULL DEFAULT false,
  validado_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  validado_em timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(collection_id, ferramenta)
);

-- Updated at triggers
CREATE TRIGGER canonical_business_models_updated_at BEFORE UPDATE ON canonical_business_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pnbox_collections_updated_at BEFORE UPDATE ON pnbox_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pnbox_entries_updated_at BEFORE UPDATE ON pnbox_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();