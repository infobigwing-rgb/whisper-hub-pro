
-- Bengali / Banglish normalization helper
CREATE OR REPLACE FUNCTION public.normalize_bn_search(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(t,''))
$$;

-- Add generated search_text columns + GIN indexes
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(assignee,''))) STORED;
CREATE INDEX IF NOT EXISTS tasks_search_idx ON public.tasks USING GIN (to_tsvector('simple', search_text));

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(ai_summary,''))) STORED;
CREATE INDEX IF NOT EXISTS notes_search_idx ON public.notes USING GIN (to_tsvector('simple', search_text));

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(coalesce(name,'') || ' ' || coalesce(company,'') || ' ' || coalesce(email,'') || ' ' || coalesce(notes,''))) STORED;
CREATE INDEX IF NOT EXISTS leads_search_idx ON public.leads USING GIN (to_tsvector('simple', search_text));

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(coalesce(title,'') || ' ' || coalesce(description,''))) STORED;
CREATE INDEX IF NOT EXISTS events_search_idx ON public.calendar_events USING GIN (to_tsvector('simple', search_text));

ALTER TABLE public.email_drafts ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(coalesce(subject,'') || ' ' || coalesce(to_email,'') || ' ' || coalesce(body_markdown,''))) STORED;
CREATE INDEX IF NOT EXISTS emails_search_idx ON public.email_drafts USING GIN (to_tsvector('simple', search_text));

ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (lower(coalesce(original_text,'') || ' ' || coalesce(sender,''))) STORED;
CREATE INDEX IF NOT EXISTS msgs_search_idx ON public.whatsapp_messages USING GIN (to_tsvector('simple', search_text));

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications all" ON public.notifications FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
