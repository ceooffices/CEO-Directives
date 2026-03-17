-- =============================================
-- Migration 002: Thêm event_type cho auto-escalation
-- Chạy trong Supabase Dashboard > SQL Editor
-- =============================================

-- Xóa CHECK cũ (chỉ có 5 loại)
ALTER TABLE engagement_events DROP CONSTRAINT IF EXISTS engagement_events_event_type_check;

-- Thêm CHECK mới gồm đủ 10 loại event
ALTER TABLE engagement_events ADD CONSTRAINT engagement_events_event_type_check
  CHECK (event_type IN (
    'email_sent',      -- Gửi email (manual)
    'email_opened',    -- Mở email
    'link_clicked',    -- Click link
    'confirmed',       -- Đầu mối xác nhận
    'escalated',       -- Leo thang (manual)
    'approve',         -- BOD Hosting duyệt
    'reject',          -- BOD Hosting từ chối
    'clarify',         -- Yêu cầu làm rõ
    'remind',          -- Nhắc nhở (manual)
    'view',            -- Xem directive
    'auto_remind',     -- Nhắc tự động (cron)
    'auto_escalate'    -- Leo thang tự động (cron)
  ));
