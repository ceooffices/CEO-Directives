# 📋 Nhiệm Vụ Cho Claude Code (Dự án CEO-Directives × NemoClaw)
*Người hướng dẫn/QC: Gravity (Antigravity)*

Chào bạn Claude Code, bạn là Executor. Antigravity đang lead dự án này và cần bạn triển khai 2 Task kỹ thuật dưới đây, đảm bảo tính clean và robust. Sau khi làm xong, hãy giải thích những gì bạn đã làm để Antigravity QC.

---

## Task 1: Cấu hình Router-Agent cho OpenClaw
OpenClaw hiện đang chạy trên máy ở port `18789`. Nó có sẵn 1 agent tên `router-agent` nhưng thư mục workspace hiện đang trống.
Chúng ta có 2 Agent hoạt động song song qua cấu hình Telegram dùng chung bot `@tikme_monitor_bot`:
- **`dev` (Trợ Lý Tikme)**: Focus vào quản lý nhân sự, làm task tiến độ Tikme. (Workspace: `~/.openclaw/workspace-dev`)
- **`ceo-advisor` (Gravity)**: Focus vào phân tích, query số liệu cấp CEO, cảnh báo rủi ro 5T. (Workspace: `~/ceo-directives/CEO-Directives-github/.openclaw`)

**Yêu cầu bạn làm:**
1. Di chuyển vào thư mục `~/.openclaw/workspace-router-agent/`.
2. Tạo file `IDENTITY.md` định nghĩa agent này là "OpenClaw Router" (vai trò phân luồng điều phối, không xưng hô, chỉ định tuyến cực nhanh giấu mặt).
3. Tạo file `SOUL.md` với rule cực kỳ khắt khe: 
   - Đọc tin nhắn user.
   - Trích xuất ý định.
   - Nếu hỏi về "Tuyển dụng, Tikme, tiến độ cá nhân, task" -> Chuyển routing sang agent `dev` (Tikme).
   - Nếu hỏi về "Họp BQT, CEO, Chỉ đạo, Quá hạn, 5T, LELONGSON, HM50" -> Chuyển routing sang agent `ceo-advisor` (Gravity).
   - *Ghi chú: Bạn có thể tham khảo format chuẩn của NemoClaw qua các file trong thư mục `~/.openclaw/workspace-dev/`.*
4. Bật chế độ để OpenClaw nhận biết `router-agent` là bot nhận đầu vào mặc định trên Telegram. (*Để làm được bước này, vui lòng chỉnh sửa `~/.openclaw/openclaw.json` sao cho `router-agent` có `default: true`, còn `ceo-advisor` và `dev` set `default: false` đối với input raw ban đầu.*) Khi xong, khởi động lại `ai.openclaw.gateway`.

---

## Task 2: Chạy Ngầm (Daemonize) CEO-Directives Bridge 
Gravity Agent chỉ query được số liệu từ DB nếu cổng kết nối REST API Server (Bridge) chạy 24/7 ở port 3101.
Hiện tại source script nằm ở: `/Users/esuhai/ceo-directives/CEO-Directives-github/automation/openclaw-bridge.js`.

**Yêu cầu bạn làm:**
1. Inspect file script `openclaw-bridge.js`. Cổng server này load các environment variables từ file `automation/.env`.
2. Cài đặt toàn cục (global) `pm2` nếu trên máy chưa có (`npm i -g pm2`).
3. Khởi chạy file `openclaw-bridge.js` với `pm2` với tên process là `ceo_bridge`. Môi trường phải đọc đúng file `.env`.
4. Thiết lập `pm2 save` để nó tự chạy lại nếu máy Mini Mac khởi động lại.
5. Sau khi Bridge chạy, verify bằng lệnh `curl http://localhost:3101/health` để xác minh cổng API đang mở và trả status 200.

---

### Yêu cầu báo cáo
Sau khi xong, hãy in ra log terminal để Antigravity QC:
- Trạng thái các file của router-agent (đã tạo thành công).
- Kết quả `pm2 status`.
- Kết quả `curl` cổng 3101.
Lưu ý: Không can thiệp vô schema database và không sửa logic code bên trong file Bridge js.
