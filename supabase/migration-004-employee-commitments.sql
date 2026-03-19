-- =============================================
-- CEO Directives — Migration 004
-- Bảng employee_commitments (334 nhân viên)
-- Cam kết cá nhân 2026 — import từ employee_kpi.json
-- =============================================

-- 6. employee_commitments — Cam kết cá nhân nhân viên
CREATE TABLE IF NOT EXISTS employee_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id),
  name TEXT NOT NULL,
  department TEXT,
  role TEXT,
  commit_number NUMERIC DEFAULT 0,
  target TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_commit_name ON employee_commitments(name);
CREATE INDEX IF NOT EXISTS idx_emp_commit_dept ON employee_commitments(department);
CREATE INDEX IF NOT EXISTS idx_emp_commit_staff ON employee_commitments(staff_id);

-- RLS
ALTER TABLE employee_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_emp_commit" ON employee_commitments FOR SELECT TO anon USING (true);

-- Auto-update trigger
CREATE TRIGGER tr_emp_commit_updated
  BEFORE UPDATE ON employee_commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
