-- Enable RLS on all tables
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE research ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_business_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnbox_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnbox_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-user isolation

-- Plans: all authenticated users can read active plans
CREATE POLICY "plans_read_active" ON plans
  FOR SELECT TO authenticated
  USING (ativo = true);

-- Profiles: users can only see/modify their own profile
CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Research: users can only access their own research
CREATE POLICY "research_own_all" ON research
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Research tasks: through research ownership
CREATE POLICY "research_tasks_own_all" ON research_tasks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_tasks.research_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_tasks.research_id AND r.user_id = auth.uid()
  ));

-- Research sources: through research ownership
CREATE POLICY "research_sources_own_all" ON research_sources
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_sources.research_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_sources.research_id AND r.user_id = auth.uid()
  ));

-- Research evidence: through research ownership
CREATE POLICY "research_evidence_own_all" ON research_evidence
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_evidence.research_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_evidence.research_id AND r.user_id = auth.uid()
  ));

-- Research claims: through research ownership
CREATE POLICY "research_claims_own_all" ON research_claims
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_claims.research_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_claims.research_id AND r.user_id = auth.uid()
  ));

-- Research iterations: through research ownership
CREATE POLICY "research_iterations_own_all" ON research_iterations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_iterations.research_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_iterations.research_id AND r.user_id = auth.uid()
  ));

-- Research gaps: through research ownership
CREATE POLICY "research_gaps_own_all" ON research_gaps
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_gaps.research_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_gaps.research_id AND r.user_id = auth.uid()
  ));

-- Research contradictions: through research ownership
CREATE POLICY "research_contradictions_own_all" ON research_contradictions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_contradictions.research_id AND r.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM research r WHERE r.id = research_contradictions.research_id AND r.user_id = auth.uid()
  ));

-- Canonical Business Models: users can only access their own
CREATE POLICY "cbm_own_all" ON canonical_business_models
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PNBOX Collections: users can only access their own
CREATE POLICY "pnbox_collections_own_all" ON pnbox_collections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PNBOX Entries: through collection ownership
CREATE POLICY "pnbox_entries_own_all" ON pnbox_entries
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pnbox_collections pc WHERE pc.id = pnbox_entries.collection_id AND pc.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pnbox_collections pc WHERE pc.id = pnbox_entries.collection_id AND pc.user_id = auth.uid()
  ));

-- Executions: users can only access their own
CREATE POLICY "executions_own_all" ON executions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Execution Items: through execution ownership
CREATE POLICY "execution_items_own_all" ON execution_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM executions e WHERE e.id = execution_items.execution_id AND e.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM executions e WHERE e.id = execution_items.execution_id AND e.user_id = auth.uid()
  ));

-- Audit Logs: users can only see their own audit logs
CREATE POLICY "audit_logs_own_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert audit logs (for system operations)
CREATE POLICY "audit_logs_service_insert" ON audit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);