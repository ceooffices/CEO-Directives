# Task Assignment: Port 6 WF Notion → Supabase

> Gravity đã hoàn thành Phase 0. Dưới đây là phân công cho ClaudeCode agents.

---

## CC-A: WF1 + WF2 (Chạy TRƯỚC)

### Mục tiêu
Port `wf1-approval.js`, `wf2-form-processor.js`, `wf2-directive-progress.js` từ Notion → Supabase.

### Files cần sửa

| File | Hành động |
|------|----------|
| `automation/wf1-approval.js` | Swap import, refactor queries |
| `automation/wf2-form-processor.js` | Swap import, match by `directive_code` |
| `automation/wf2-directive-progress.js` | Swap import, simplify extraction |

### Hướng dẫn chi tiết

**1. Thay import:**
```diff
- const { queryClarificationsStep1, queryClarificationsStep2, ... } = require('./lib/notion-client');
- const { logExecution } = require('./lib/logger');
+ const { queryPendingApproval, queryApprovedPendingConfirm, updateDirective, logEvent,
+         getStaffEmail, BOD_HOSTING_EMAIL, ALWAYS_CC, directiveUrl } = require('./lib/supabase-client');
```

**2. Thay data extraction (WF1):**

Notion trả về `page.properties`:
```javascript
// CŨ (Notion)
const tieuDe = safeText(props['Tiêu đề']?.title);
const tinhTrang = safeSelect(props['TINH_TRANG']?.select);
const emailNguoiChiDao = await resolveEmailFromRelation(props['Email người chỉ đạo']);
```

Supabase trả về flat object:
```javascript
// MỚI (Supabase) 
const tieuDe = row.directive_code;         // hoặc row.t2_nhiem_vu
const tinhTrang = row.tinh_trang;
const emailNguoiChiDao = row.chi_dao_email || await getStaffEmail(row.t1_dau_moi);
```

**3. Thay update (WF1):**
```diff
- await updatePage(item.id, { 'TINH_TRANG': { select: { name: 'Đã gửi email' } } });
+ await updateDirective(item.id, { tinh_trang: 'da_gui_email' });
```

**4. Thay logging:**
```diff
- await logExecution({ workflow: 'WF1', step: 'STEP1', status: '✅ Success', ... });
+ await logEvent(item.id, 'wf1_step1_sent', { title: item.tieuDe, emailTo: item.sendTo });
```

**5. WF2 form-processor**: Match `clarificationId` bằng `directive_code`:
```diff
- await updateNotionFromForm(formData);  // uses Notion page ID
+ await updateDirectiveByCode(formData.clarificationId, {
+   t2_nhiem_vu: formData.t2NhiemVu,
+   t3_chi_tieu: formData.t3ChiTieu,
+   t4_thoi_han: formData.t4ThoiHan,
+   tinh_trang: 'da_xac_nhan',
+ });
```

**6. URL**: `page.url` → `directiveUrl(row.id)`

### Test
```bash
node wf1-approval.js --dry-run
node wf2-form-processor.js --dry-run
node wf2-directive-progress.js --dry-run
```

### Không chạm
`wf3-*.js`, `wf4-*.js`, `wf5-*.js`, `wf6-*.js`

---

## CC-B: WF3 + WF4 (Song song CC-C, SAU CC-A)

### Mục tiêu
Port `wf3-directive-status.js` và `wf4-directive-escalation.js`.

### Files cần sửa

| File | Hành động |
|------|----------|
| `automation/wf3-directive-status.js` | Bỏ file snapshot, dùng `getDirectiveStatusSnapshot()` + `lls_step_history` |
| `automation/wf4-directive-escalation.js` | Swap import, dùng `queryOverdueDirectives()` |

### Hướng dẫn WF3

WF3 cũ dùng `directive_snapshot.json` file → compare → detect changes.
WF3 mới: dùng `getDirectiveStatusSnapshot()` rồi compare với file (giữ forward-compatible), HOẶC dùng `getRecentStatusChanges(since)` từ `lls_step_history`.

**Ưu tiên approach 2** (nếu `lls_step_history` có đủ data):
```javascript
const { getRecentStatusChanges, logEvent, directiveUrl, ALWAYS_CC } = require('./lib/supabase-client');

async function run() {
  const changes = await getRecentStatusChanges(lastCheckTimestamp);
  // Mỗi change đã có directive info qua JOIN
  for (const change of changes) {
    // Gửi email notification...
  }
}
```

### Hướng dẫn WF4

```diff
- const { queryOverdueClarifications, ... } = require('./lib/notion-client');
+ const { queryOverdueDirectives, getStaffEmail, logEvent, directiveUrl,
+         BOD_HOSTING_EMAIL, ALWAYS_CC, CEO_EMAIL } = require('./lib/supabase-client');
```

Data extraction simplifed:
```javascript
// Supabase row flat access — không cần safeText, safeSelect, safeDate
const title = row.directive_code;
const tinhTrang = row.tinh_trang;
const dauMoi = row.t1_dau_moi;
const deadlineStr = row.t4_thoi_han;
const emailDauMoi = row.t1_email || await getStaffEmail(row.t1_dau_moi);
```

### Test
```bash
node wf3-directive-status.js --dry-run
node wf4-directive-escalation.js --dry-run
```

### Không chạm
`wf1-*.js`, `wf2-*.js`, `wf5-*.js`, `wf6-*.js`

---

## CC-C: WF5 + Cleanup (Song song CC-B, SAU CC-A)

### Mục tiêu
Port `wf5-reminders.js`, deprecate WF6, cleanup `scheduler.js`.

### Files cần sửa

| File | Hành động |
|------|----------|
| `automation/wf5-reminders.js` | Swap import, simplify |
| `automation/wf6-dashboard-sync.js` | Thêm deprecation notice ở đầu file |
| `automation/scheduler.js` | Xóa WF6 khỏi schedule |

### Hướng dẫn WF5

```diff
- const { queryActiveClarifications, ... } = require('./lib/notion-client');
+ const { queryActiveDirectives, logEvent, directiveUrl,
+         BOD_HOSTING_EMAIL, ALWAYS_CC } = require('./lib/supabase-client');
```

Simplify property extraction (bỏ hết `safeText`, `safeSelect`, etc.):
```javascript
for (const task of tasks) {
  const title = task.directive_code || task.t2_nhiem_vu;
  const deadlineStr = task.t4_thoi_han;
  const recipientEmail = task.bod_hosting_email || BOD_HOSTING_EMAIL;
  const recipientName = task.t1_dau_moi || 'BOD Hosting';
  // ...
}
```

URL trong email: thay `https://www.notion.so/...` → `directiveUrl(task.id)`.

### Hướng dẫn WF6

Thêm 1 dòng ở đầu file sau comment block:
```javascript
console.warn('[WF6] ⚠️ DEPRECATED — Dashboard đọc Supabase trực tiếp. File này không còn cần thiết.');
console.warn('[WF6] Xem: web/src/lib/supabase.ts');
process.exit(0);
```

### Test
```bash
node wf5-reminders.js --dry-run
node wf6-dashboard-sync.js  # Phải exit ngay với warning
```

### Không chạm
`wf1-*.js`, `wf2-*.js`, `wf3-*.js`, `wf4-*.js`

---

## Chung cho tất cả agents

- **Commit message**: Viết tiếng Việt, dễ hiểu, theo format `emoji Mô tả ngắn`
- **Không sửa** `lib/supabase-client.js` — đây là shared lib Gravity đã tạo
- **Không sửa** `lib/email-sender.js`, `lib/email-templates.js` — giữ nguyên
- **Test**: Luôn chạy `--dry-run` sau khi port xong
