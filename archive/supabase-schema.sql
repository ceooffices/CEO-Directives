-- =============================================
-- CEO Directives — Supabase Schema
-- Chạy SQL này trong Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Bảng chỉ đạo (sync từ Notion hoặc nhập trực tiếp)
CREATE TABLE IF NOT EXISTS directives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Chờ làm rõ',
  dau_moi TEXT DEFAULT '',
  nhiem_vu TEXT DEFAULT '',
  deadline DATE,
  hm50_ref TEXT,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index cho queries thường dùng
CREATE INDEX IF NOT EXISTS idx_directives_status ON directives(status);
CREATE INDEX IF NOT EXISTS idx_directives_deadline ON directives(deadline);
CREATE INDEX IF NOT EXISTS idx_directives_dau_moi ON directives(dau_moi);

-- 2. Bảng tracking email open (pattern từ Track_URL)
CREATE TABLE IF NOT EXISTS email_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id UUID REFERENCES directives(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  is_bot BOOLEAN DEFAULT false,
  opened_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_opens_directive ON email_opens(directive_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_recipient ON email_opens(recipient);

-- 3. Sample data để test dashboard (xóa sau khi có data thật)
INSERT INTO directives (title, status, dau_moi, nhiem_vu, deadline, section) VALUES
  ('Triển khai hệ thống Dashboard 3 tầng', 'Đang thực hiện', 'Anh Tín', 'Setup Bitrix + Dashboard CEO', '2026-03-20', 'SEC-VII'),
  ('Tái cấu trúc phòng XKLĐ', 'Đã xác nhận 5T', 'Chị Hoa', 'Sáp nhập 3 phòng thành 1', '2026-04-01', 'SEC-III'),
  ('Review KPI Q1 toàn tập đoàn', 'Chờ làm rõ', 'Anh Minh', 'Thu thập KPI từ 9 MSA', '2026-03-15', 'SEC-II'),
  ('Xây dựng landing page TikMe', 'Đang thực hiện', 'Anh Nam', '8 landing page chuyên biệt', '2026-03-25', 'SEC-VI'),
  ('Chương trình Kaizen Q1', 'Hoàn thành', 'Chị Lan', 'PDCA training cho 200 NV', '2026-03-10', 'SEC-VIII'),
  ('Pipeline KOKA→MSA liền mạch', 'Đang thực hiện', 'Anh Tín', 'Loại bỏ link yếu pipeline', '2026-03-12', 'SEC-III'),
  ('Văn hóa chiến binh chủ động', 'Chờ xác nhận', 'Chị Hạnh', 'Workshop tư duy đầu mối', '2026-04-15', 'SEC-V'),
  ('Hệ thống lương theo kết quả', 'Đã xác nhận 5T', 'Anh Đức', 'Pilot 2 phòng ban', '2026-03-08', 'SEC-IV'),
  ('Marketing đo lường TikMe', 'Đang thực hiện', 'Anh Nam', '2.483 leads mới/năm', '2026-06-30', 'SEC-VI'),
  ('Chuyển đổi tư duy XKLĐ→NLQT', 'Chờ làm rõ', 'Anh Sơn', 'Truyền thông nội bộ', '2026-03-18', 'SEC-I');

-- Enable RLS (Row Level Security) - optional
-- ALTER TABLE directives ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;
