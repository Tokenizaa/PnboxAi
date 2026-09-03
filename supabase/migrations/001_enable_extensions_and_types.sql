-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE plan_status AS ENUM ('active', 'inactive', 'trial', 'expired');
CREATE TYPE research_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE evidence_type AS ENUM ('source', 'document', 'web', 'api', 'manual');
CREATE TYPE claim_status AS ENUM ('draft', 'validated', 'rejected', 'needs_review');
CREATE TYPE pnbox_tool AS ENUM (
  'segmentacao', 'personas', 'jornada', 'proposta_valor',
  'concorrencia', 'canais', 'funil_vendas', 'investimento_inicial',
  'custos_fixos', 'custos_variaveis', 'receitas', 'dre_projetado',
  'indicadores', 'simulador_cenarios'
);
CREATE TYPE execution_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'paused');
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import');