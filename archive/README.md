# 📦 Archive — Các file đã lỗi thời

> Chuyển vào archive ngày 2026-03-16
> Lý do: Hệ thống đã chuyển sang Next.js + Notion API

## Danh sách

| Folder/File | Mô tả | Thay thế bởi |
|---|---|---|
| `apps-script/` | Google Apps Script tạo form | n8n + automation/ |
| `bod_meeting/` | GAS Dashboard cũ (33 files, 600KB+) | `web/` (Next.js) |
| `dashboard/` | HTML Dashboard cũ | `web/` (Next.js) |
| `core/` | Docs cũ (CORE_RULES, BOD_FULL_FLOW) | CLAUDE.md, CONTENT_BIBLE |
| `supabase.ts` | Supabase client cho web | `web/src/lib/notion.ts` |
| `supabase-client.js` | Supabase client cho automation | Notion API trực tiếp |
| `supabase-schema.sql` | SQL schema cho Supabase tables | Notion là DB chính |

## Lưu ý
- Không xóa — giữ để tham khảo nếu cần
- Không import từ archive trong code mới
- Git history vẫn giữ nguyên lịch sử thay đổi
