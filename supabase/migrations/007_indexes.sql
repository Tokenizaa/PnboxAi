-- Indexes for performance

-- Profiles
CREATE INDEX idx_profiles_plano_id ON profiles(plano_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Research
CREATE INDEX idx_research_user_id ON research(user_id);
CREATE INDEX idx_research_plano_id ON research(plano_id);
CREATE INDEX idx_research_status ON research(status);
CREATE INDEX idx_research_created_at ON research(created_at DESC);

-- Research tasks
CREATE INDEX idx_research_tasks_research_id ON research_tasks(research_id);
CREATE INDEX idx_research_tasks_status ON research_tasks(status);

-- Research sources
CREATE INDEX idx_research_sources_research_id ON research_sources(research_id);

-- Research evidence
CREATE INDEX idx_research_evidence_research_id ON research_evidence(research_id);
CREATE INDEX idx_research_evidence_source_id ON research_evidence(source_id);
CREATE INDEX idx_research_evidence_task_id ON research_evidence(task_id);

-- Research claims
CREATE INDEX idx_research_claims_research_id ON research_claims(research_id);
CREATE INDEX idx_research_claims_evidence_id ON research_claims(evidence_id);
CREATE INDEX idx_research_claims_status ON research_claims(status);

-- Research iterations
CREATE INDEX idx_research_iterations_research_id ON research_iterations(research_id);

-- Research gaps
CREATE INDEX idx_research_gaps_research_id ON research_gaps(research_id);

-- Research contradictions
CREATE INDEX idx_research_contradictions_research_id ON research_contradictions(research_id);

-- Canonical Business Models
CREATE INDEX idx_cbm_research_id ON canonical_business_models(research_id);
CREATE INDEX idx_cbm_user_id ON canonical_business_models(user_id);
CREATE INDEX idx_cbm_ativo ON canonical_business_models(ativo);

-- PNBOX Collections
CREATE INDEX idx_pnbox_collections_user_id ON pnbox_collections(user_id);
CREATE INDEX idx_pnbox_collections_plano_id ON pnbox_collections(plano_id);
CREATE INDEX idx_pnbox_collections_canonical_model_id ON pnbox_collections(canonical_model_id);

-- PNBOX Entries
CREATE INDEX idx_pnbox_entries_collection_id ON pnbox_entries(collection_id);
CREATE INDEX idx_pnbox_entries_ferramenta ON pnbox_entries(ferramenta);

-- Executions
CREATE INDEX idx_executions_user_id ON executions(user_id);
CREATE INDEX idx_executions_plano_id ON executions(plano_id);
CREATE INDEX idx_executions_collection_id ON executions(collection_id);
CREATE INDEX idx_executions_status ON executions(status);

-- Execution Items
CREATE INDEX idx_execution_items_execution_id ON execution_items(execution_id);
CREATE INDEX idx_execution_items_ferramenta ON execution_items(ferramenta);
CREATE INDEX idx_execution_items_status ON execution_items(status);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_recurso ON audit_logs(recurso);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);