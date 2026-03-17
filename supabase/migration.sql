-- =============================================
-- CEO Directives — Supabase Schema Migration
-- Phase 1-2: 5 tables + RLS + indexes
-- Chạy trong Supabase Dashboard > SQL Editor
-- =============================================

-- 1. hm50 — 50 Hạng Mục cam kết 2026 (tạo trước vì directives reference nó)
CREATE TABLE IF NOT EXISTS hm50 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hm_number INTEGER UNIQUE NOT NULL CHECK (hm_number BETWEEN 1 AND 50),
  ten TEXT NOT NULL,
  dau_moi TEXT,
  tinh_trang TEXT DEFAULT 'chua_bat_dau'
    CHECK (tinh_trang IN ('hoan_thanh', 'dang_lam', 'chua_bat_dau', 'nghen')),
  muc_tieu TEXT,
  thoi_han TEXT,
  bsc_perspective TEXT
    CHECK (bsc_perspective IN ('tai_chinh', 'khach_hang', 'quy_trinh', 'hoc_hoi')),
  phan_cl TEXT,
  notion_page_id TEXT,
  directive_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hm50_number ON hm50(hm_number);
CREATE INDEX IF NOT EXISTS idx_hm50_bsc ON hm50(bsc_perspective);

-- 2. staff — Nhân sự (366 người, seed từ CSV)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  zone INTEGER,
  title TEXT,
  company TEXT,
  location TEXT,
  is_manager BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_code ON staff(staff_code);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);

-- 3. directives — Chỉ đạo (core table)
CREATE TABLE IF NOT EXISTS directives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_code TEXT UNIQUE NOT NULL,
  notion_page_id TEXT,

  -- 5T
  t1_dau_moi TEXT NOT NULL,
  t1_email TEXT,
  t2_nhiem_vu TEXT NOT NULL,
  t3_chi_tieu TEXT,
  t4_thoi_han DATE,
  t5_thanh_vien TEXT[],

  -- Origin tracking (WHERE FROM)
  loai TEXT CHECK (loai IN ('tu_50hm', 'leo_thang', 'bo_sung', 'moi')),
  hm50_id UUID REFERENCES hm50(id),
  meeting_source TEXT,

  -- Directive relationship (dòng thời gian)
  parent_directive_id UUID REFERENCES directives(id),
  relationship_type TEXT CHECK (relationship_type IN ('supersedes', 'escalates', 'continues')),
  relationship_note TEXT,

  -- LELONGSON Pipeline (WHERE AT)
  lls_step INTEGER DEFAULT 1 CHECK (lls_step BETWEEN 1 AND 7),
  tinh_trang TEXT DEFAULT 'cho_xu_ly',

  -- Routing
  bod_hosting_email TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directives_status ON directives(tinh_trang);
CREATE INDEX IF NOT EXISTS idx_directives_deadline ON directives(t4_thoi_han);
CREATE INDEX IF NOT EXISTS idx_directives_dau_moi ON directives(t1_dau_moi);
CREATE INDEX IF NOT EXISTS idx_directives_lls_step ON directives(lls_step);
CREATE INDEX IF NOT EXISTS idx_directives_loai ON directives(loai);
CREATE INDEX IF NOT EXISTS idx_directives_hm50 ON directives(hm50_id);

-- 4. lls_step_history — Lịch sử LELONGSON per directive
CREATE TABLE IF NOT EXISTS lls_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id UUID REFERENCES directives(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lls_history_directive ON lls_step_history(directive_id);
CREATE INDEX IF NOT EXISTS idx_lls_history_created ON lls_step_history(created_at);

-- 5. engagement_events — Email/action tracking
CREATE TABLE IF NOT EXISTS engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id UUID REFERENCES directives(id),
  event_type TEXT CHECK (event_type IN ('email_sent', 'email_opened', 'link_clicked', 'confirmed', 'escalated')),
  recipient_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_directive ON engagement_events(directive_id);
CREATE INDEX IF NOT EXISTS idx_engagement_type ON engagement_events(event_type);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE hm50 ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE lls_step_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

-- Anon key: chỉ đọc (cho dashboard)
CREATE POLICY "anon_read_hm50" ON hm50 FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_staff" ON staff FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_directives" ON directives FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_lls_history" ON lls_step_history FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_engagement" ON engagement_events FOR SELECT TO anon USING (true);

-- Service role: full access (backend scripts + API routes)
-- (service_role bypasses RLS by default, không cần policy riêng)

-- =============================================
-- AUTO-UPDATE updated_at trigger
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_directives_updated
  BEFORE UPDATE ON directives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_hm50_updated
  BEFORE UPDATE ON hm50
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
