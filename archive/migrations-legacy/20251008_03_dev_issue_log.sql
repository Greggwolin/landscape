-- 20251008_03_dev_issue_log.sql
-- v1.0 · Dev Issue Log

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.dev_issue_log (
  issue_id BIGSERIAL PRIMARY KEY,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('bug','feature','feedback','question','other')),
  title TEXT,
  description TEXT NOT NULL,
  page_path TEXT,
  component_path TEXT,
  branch TEXT,
  commit_sha TEXT,
  reporter_name TEXT,
  reporter_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_issue_page_path ON public.dev_issue_log(page_path);
CREATE INDEX IF NOT EXISTS idx_dev_issue_issue_type ON public.dev_issue_log(issue_type);
CREATE INDEX IF NOT EXISTS idx_dev_issue_created_at ON public.dev_issue_log(created_at DESC);
