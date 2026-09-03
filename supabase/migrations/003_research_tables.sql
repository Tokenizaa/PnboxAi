-- Research engine tables
CREATE TABLE research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  objetivo text,
  status research_status NOT NULL DEFAULT 'pending',
  configuracao jsonb NOT NULL DEFAULT '{}',
  resultado_final jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL,
  parametros jsonb NOT NULL DEFAULT '{}',
  resultado jsonb,
  status research_status NOT NULL DEFAULT 'pending',
  erro text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  tipo evidence_type NOT NULL,
  titulo text NOT NULL,
  url text,
  conteudo text,
  metadados jsonb NOT NULL DEFAULT '{}',
  relevancia numeric(3,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  source_id uuid REFERENCES research_sources(id) ON DELETE SET NULL,
  task_id uuid REFERENCES research_tasks(id) ON DELETE SET NULL,
  tipo evidence_type NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  metadados jsonb NOT NULL DEFAULT '{}',
  confianca numeric(3,2),
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES research_evidence(id) ON DELETE SET NULL,
  afirmacao text NOT NULL,
  justificativa text,
  status claim_status NOT NULL DEFAULT 'draft',
  validado_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  validado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_iterations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  numero int NOT NULL,
  prompt text NOT NULL,
  resposta jsonb NOT NULL,
  tokens_usados int,
  modelo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  severidade text NOT NULL,
  sugestao text,
  resolvido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE research_contradictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  claim_id_1 uuid NOT NULL REFERENCES research_claims(id) ON DELETE CASCADE,
  claim_id_2 uuid NOT NULL REFERENCES research_claims(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  resolucao text,
  resolvido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Updated at triggers
CREATE TRIGGER research_updated_at BEFORE UPDATE ON research
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER research_tasks_updated_at BEFORE UPDATE ON research_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER research_claims_updated_at BEFORE UPDATE ON research_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();