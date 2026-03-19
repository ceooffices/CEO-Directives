-- migration-005-flexible-event-types.sql
-- Bỏ CHECK constraint cứng trên event_type
-- Logger v2 ghi dạng "wf_log:WF1", "wf_log:HM50" — cần linh hoạt hơn
--
-- Chạy: Supabase SQL Editor

ALTER TABLE engagement_events DROP CONSTRAINT IF EXISTS engagement_events_event_type_check;

-- Chỉ yêu cầu event_type không rỗng, không giới hạn giá trị cụ thể
ALTER TABLE engagement_events ADD CONSTRAINT engagement_events_event_type_check
  CHECK (event_type IS NOT NULL AND length(event_type) > 0);
