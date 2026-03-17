# Task cho ClaudeCode — Làm song song với Gravity

> Ngày: 17/03/2026
> Giao bởi: Gravity (UI/Frontend)
> Ưu tiên: CAO — cần xong trước khi deploy

---

## Task 1: Sửa từ cấm Content Bible trong backend (10+ files)

Theo CONTENT_BIBLE_AIGENT.md v2.1, các từ sau **CẤM DÙNG** trong toàn bộ codebase:

| Từ cấm | Thay bằng |
|---|---|
| quá hạn | cần quan tâm |
| leo thang | báo cáo rủi ro / tín hiệu rủi ro |
| nhắc nhở | đồng hành / hỗ trợ |
| mất kiểm soát | cần hỗ trợ đặc biệt |
| báo động | tín hiệu cần quan tâm |

### Files cần sửa (phân vùng ClaudeCode):

1. **`automation/telegram-bot.js`** — 20+ hits (LỚN NHẤT)
2. **`automation/auto-escalation.js`** — 5 hits
3. **`automation/ai-analyzer.js`** — 6 hits
4. **`automation/intent-detector.js`** — 5 hits
5. **`automation/bod-import.js`** — 10+ hits
6. **`automation/hm50-linker.js`** — vài hits
7. **`automation/report-generator.js`** — vài hits
8. **`automation/dedup-directives.js`** — vài hits
9. **`automation/rag-engine.js`** — vài hits
10. **`automation/wf4-form-processor.js`** — vài hits
11. **`automation/wf5-form-processor.js`** — vài hits

### Quy tắc:
- **Chỉ sửa user-facing text** (log messages, comments, output strings)
- **KHÔNG sửa** tên DB fields (`leo_thang` trong `loai` column) — đó là data value
- **KHÔNG sửa** tên biến/function nội bộ nếu chúng là technical identifiers
- Test sau khi sửa

---

## Task 2: Mở rộng DB engagement_events CHECK constraint

Hiện tại DB chỉ cho phép 5 event types:
```sql
event_type = ANY (ARRAY['email_sent', 'email_opened', 'link_clicked', 'confirmed', 'escalated'])
```

Cần mở rộng thêm:
```sql
ALTER TABLE engagement_events DROP CONSTRAINT IF EXISTS engagement_events_event_type_check;
ALTER TABLE engagement_events ADD CONSTRAINT engagement_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'email_sent', 'email_opened', 'link_clicked',
    'confirmed', 'escalated',
    'approve', 'reject', 'confirm', 'clarify',
    'remind', 'view', 'auto_remind', 'auto_escalate'
  ]));
```

Project Supabase: `fgiszdvchpknmyfscxnp` (Track_URL)

---

## Lưu ý
- Gravity đang build frontend song song (engagement dashboard, timeline, diff view)
- Sau khi xong, Gravity sẽ QC review code ClaudeCode
- Commit message: `✨ Cập nhật từ ngữ theo Content Bible v2.1 — triết lý Cố vấn Đồng hành`
