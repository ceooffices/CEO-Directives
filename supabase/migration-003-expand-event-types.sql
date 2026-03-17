-- migration-003-expand-event-types.sql
-- Mở rộng engagement_events.event_type CHECK constraint
-- Thêm các event types cho API routes (approve, reject, confirm, clarify, remind, view)
-- và auto-escalation (auto_remind, auto_escalate)
--
-- Chạy: psql hoặc Supabase SQL Editor
-- Project: fgiszdvchpknmyfscxnp

ALTER TABLE engagement_events DROP CONSTRAINT IF EXISTS engagement_events_event_type_check;
ALTER TABLE engagement_events ADD CONSTRAINT engagement_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'email_sent', 'email_opened', 'link_clicked',
    'confirmed', 'escalated',
    'approve', 'reject', 'confirm', 'clarify',
    'remind', 'view', 'auto_remind', 'auto_escalate'
  ]));
