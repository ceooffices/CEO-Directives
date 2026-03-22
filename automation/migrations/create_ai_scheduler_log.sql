-- AI Scheduler Log Table
-- Lưu lại mỗi quyết định của AI Scheduler
-- Chạy trong Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_scheduler_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot JSONB,
  changes_detected TEXT,
  ai_decision JSONB,
  workflows_executed TEXT[] DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  execution_result JSONB,
  dry_run BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho query gần đây
CREATE INDEX IF NOT EXISTS idx_scheduler_log_checked_at 
  ON ai_scheduler_log (checked_at DESC);

-- RLS: Chỉ service role được đọc/ghi
ALTER TABLE ai_scheduler_log ENABLE ROW LEVEL SECURITY;

-- Policy cho service role (tự động có full access qua service_role key)
-- Không cần thêm policy vì service_role bypass RLS

COMMENT ON TABLE ai_scheduler_log IS 'Log quyết định của AI Scheduler - thay thế cron fix cứng';
