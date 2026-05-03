-- AUTONOMOUS AGENT FEATURES FOR SALES & MARKETING
-- This migration adds tables and functions for AI-powered sales agent capabilities

-- Sales Pipeline Stages
CREATE TABLE IF NOT EXISTS public.sales_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#0ea5e9',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sales_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stages all" ON public.sales_pipeline_stages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enhanced Leads with Agent Scoring
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.sales_pipeline_stages ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'whatsapp';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS engagement_score INT DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS conversion_probability FLOAT DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estimated_deal_value NUMERIC(12, 2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Automated Email Sequences
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL, -- 'new_lead', 'no_contact_30d', 'stalled_deal', 'manual'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sequences all" ON public.email_sequences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER email_sequences_updated BEFORE UPDATE ON public.email_sequences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Email Sequence Steps
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.email_sequences ON DELETE CASCADE,
  step_number INT NOT NULL,
  delay_days INT DEFAULT 0,
  subject TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own steps all" ON public.email_sequence_steps FOR ALL USING (
  sequence_id IN (SELECT id FROM public.email_sequences WHERE user_id = auth.uid())
) WITH CHECK (
  sequence_id IN (SELECT id FROM public.email_sequences WHERE user_id = auth.uid())
);

-- Automation Rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger TEXT NOT NULL, -- JSON condition
  actions TEXT NOT NULL, -- JSON array of actions
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rules all" ON public.automation_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER automation_rules_updated BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lead Interactions (calls, emails, meetings)
CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'email', 'call', 'meeting', 'message'
  duration_minutes INT,
  notes TEXT,
  outcome TEXT, -- 'positive', 'neutral', 'negative'
  interaction_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interactions all" ON public.lead_interactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Insights & Recommendations
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'scoring_update', 'next_action', 'risk_alert', 'opportunity'
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  confidence_score FLOAT DEFAULT 0,
  is_actioned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insights all" ON public.ai_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agent Configuration & Settings
CREATE TABLE IF NOT EXISTS public.agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agent_name TEXT DEFAULT 'ChatFlow Agent',
  description TEXT,
  model TEXT DEFAULT 'claude-3-haiku', -- AI model to use
  max_daily_actions INT DEFAULT 100,
  auto_followup_enabled BOOLEAN DEFAULT true,
  auto_followup_days INT DEFAULT 3,
  lead_score_weights JSONB DEFAULT '{}',
  response_tone TEXT DEFAULT 'professional', -- professional, friendly, formal
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own config all" ON public.agent_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER agent_config_updated BEFORE UPDATE ON public.agent_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Agent Activity Log
CREATE TABLE IF NOT EXISTS public.agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'email_sent', 'lead_scored', 'followup_scheduled', etc.
  lead_id UUID REFERENCES public.leads ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity all" ON public.agent_activity_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS agent_activity_user_date_idx ON public.agent_activity_log (user_id, created_at DESC);

-- Lead Score History (for analytics)
CREATE TABLE IF NOT EXISTS public.lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads ON DELETE CASCADE,
  ai_score INT,
  engagement_score INT,
  conversion_probability FLOAT,
  reason_for_change TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lead_score_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history all" ON public.lead_score_history FOR ALL USING (
  lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
) WITH CHECK (
  lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
);

-- Add search text to key tables
ALTER TABLE public.sales_pipeline_stages ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(name)) STORED;
CREATE INDEX IF NOT EXISTS stages_search_idx ON public.sales_pipeline_stages USING GIN (to_tsvector('simple', search_text));

ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(coalesce(name,'') || ' ' || coalesce(description,''))) STORED;
CREATE INDEX IF NOT EXISTS sequences_search_idx ON public.email_sequences USING GIN (to_tsvector('simple', search_text));

ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(coalesce(name,'') || ' ' || coalesce(description,''))) STORED;
CREATE INDEX IF NOT EXISTS rules_search_idx ON public.automation_rules USING GIN (to_tsvector('simple', search_text));

-- Function to calculate lead score (AI-ready)
CREATE OR REPLACE FUNCTION public.calculate_lead_score(lead_id uuid)
RETURNS int AS $$
DECLARE
  base_score int := 0;
  interaction_count int;
  days_since_interaction int;
  recent_interactions int;
  engagement_score int;
BEGIN
  -- Count interactions
  SELECT COUNT(*) INTO interaction_count FROM public.lead_interactions WHERE lead_id = $1;
  base_score := base_score + (interaction_count * 10);

  -- Recent activity bonus
  SELECT COUNT(*) INTO recent_interactions FROM public.lead_interactions 
    WHERE lead_id = $1 AND interaction_date > NOW() - interval '7 days';
  base_score := base_score + (recent_interactions * 15);

  -- Time since last interaction penalty
  SELECT EXTRACT(DAY FROM NOW() - COALESCE(MAX(interaction_date), NOW()))::int INTO days_since_interaction
    FROM public.lead_interactions WHERE lead_id = $1;
  IF days_since_interaction > 30 THEN
    base_score := base_score - 20;
  ELSIF days_since_interaction > 14 THEN
    base_score := base_score - 10;
  END IF;

  RETURN GREATEST(0, LEAST(100, base_score));
END;
$$ LANGUAGE plpgsql;

-- Function to trigger email sequences
CREATE OR REPLACE FUNCTION public.trigger_email_sequence(p_user_id uuid, p_lead_id uuid, p_trigger_type text)
RETURNS TABLE(sequence_id uuid, step_id uuid, step_number int) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id,
    ess.id,
    ess.step_number
  FROM public.email_sequences es
  JOIN public.email_sequence_steps ess ON es.id = ess.sequence_id
  WHERE es.user_id = p_user_id 
    AND es.trigger_type = p_trigger_type 
    AND es.is_active = true
  ORDER BY ess.step_number;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
REVOKE EXECUTE ON FUNCTION public.calculate_lead_score(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_lead_score(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.trigger_email_sequence(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_email_sequence(uuid, uuid, text) TO authenticated;
