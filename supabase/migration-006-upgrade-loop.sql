-- migration-006-upgrade-loop.sql
-- Thêm bảng directive_versions cho Step 3 (ChatLong AI) + Step 5-6 (Upgrade Loop)
--
-- Chạy: Supabase SQL Editor

-- 1. directive_versions — Track phiên bản nâng cấp + AI analysis
CREATE TABLE IF NOT EXISTS directive_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id UUID REFERENCES directives(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,

  -- Snapshot 5T tại thời điểm version
  t2_nhiem_vu TEXT,
  t3_chi_tieu TEXT,
  t4_thoi_han DATE,
  t5_thanh_vien TEXT[],

  -- AI Analysis (Step 3 — ChatLong)
  ai_analysis JSONB,
  ai_risk_score INTEGER CHECK (ai_risk_score IS NULL OR ai_risk_score BETWEEN 0 AND 100),
  ai_recommendations TEXT[],

  -- Upgrade tracking (Step 5-6)
  upgrade_note TEXT,
  feedback_from TEXT,
  feedback_note TEXT,

  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'analyzed', 'reviewed', 'approved', 'rejected')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_versions_directive ON directive_versions(directive_id);
CREATE INDEX IF NOT EXISTS idx_versions_number ON directive_versions(directive_id, version_number);

-- 2. Thêm current_version vào directives
ALTER TABLE directives ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- 3. Unique constraint: mỗi directive chỉ có 1 version_number unique
ALTER TABLE directive_versions ADD CONSTRAINT uq_directive_version
  UNIQUE (directive_id, version_number);
