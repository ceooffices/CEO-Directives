/**
 * insert-20042026.js
 * Import 25 chỉ đạo từ BOD 20/04/2026 vào Supabase
 *
 * Policy (theo yêu cầu CEO 24/04):
 *   - WF1 STEP1 (BOD duyệt): MẶC ĐỊNH PASS → set approved_by='BOD_20042026'
 *   - WF1 STEP2 (Đầu mối xác nhận): KHÔNG BYPASS → confirmed_by=NULL
 *     → Lần chạy WF1 kế tiếp, STEP2 sẽ gửi email xác nhận 5T cho đầu mối
 *     → Đầu mối CÓ TRÁCH NHIỆM xác nhận (không auto-confirm thay họ)
 *
 * Usage:
 *   node insert-20042026.js --dry-run   # Preview, không insert
 *   node insert-20042026.js             # Insert thật
 *
 * Rollback:
 *   DELETE FROM directives WHERE meeting_source = 'BOD 2026-04-20';
 *   DELETE FROM lls_step_history WHERE actor = 'BOD_20042026';
 */

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function supabaseInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase INSERT ${table}: ${res.status} - ${err}`);
  }
  return res.json();
}

// ==================================================================
// 25 chỉ đạo BOD 20/04/2026 (trích từ BOD_20042026.review.md — rà soát lần 2)
// ==================================================================
// Đầu mối dùng tên NGẮN để getStaffEmail() resolve (WF1 auto lookup).
// Với đầu mối chưa rõ (Yui/Duy/Tokuri/Linh): email sẽ fallback về BOD_HOSTING_EMAIL
// → BOD (letuan@esuhai.com) nhận email xác nhận thay + forward cho người phù hợp.
// ==================================================================

const items = [
  // ===== NHÓM A — TIẾP ĐÓN COH MATSUSHIMA 06/05 (12 chỉ đạo) =====
  {
    ref: 'A1',
    dau_moi: 'Shimizu',
    nhiem_vu: 'A1 - Lập kịch bản tiếp đón VIP Matsushima tổng thể: mỗi BOD mô tả phần mình phụ trách → Shimizu tổng hợp → tờ trình CEO duyệt',
    chi_tieu: 'Có 1 tờ trình tổng thể đã được TGĐ duyệt, không còn mục "chờ trao đổi"',
    thoi_han: '2026-04-22 14:30:00',
    thanh_vien: 'Lê Long Sơn, Lanh, Satomura, Ly, Tuấn, Tín',
    loai: 'moi'
  },
  {
    ref: 'A2',
    dau_moi: 'Shimizu',
    nhiem_vu: 'A2 - Họp chốt kịch bản tiếp đón VIP — tất cả đầu mối chương trình + BOD + One Team + JPC có mặt',
    chi_tieu: 'Chốt phân công, khớp timeline, không còn vướng mắc liên phòng ban',
    thoi_han: '2026-04-22 14:30:00',
    thanh_vien: 'Lanh, Satomura, Ly, Tuấn, Tín, Nhài, Utsumi, Nakagawa, Yamaoka',
    loai: 'moi'
  },
  {
    ref: 'A3',
    dau_moi: 'Yui',   // CHƯA RÕ EMAIL — fallback BOD Hosting
    nhiem_vu: 'A3 - Tổ chức lễ động viên xuất cảnh 40 phút (trọng tâm buổi 06/05): chiếu 2-3 video HV → HV phát biểu quyết tâm → phụ huynh chia sẻ → hiệu trưởng Lê Long Sơn phát biểu → Cô Matsushima động viên',
    chi_tieu: 'Cô mang về câu chuyện + gương mặt từng em; gia đình cảm nhận niềm tự hào; ghi hình đầy đủ',
    thoi_han: '2026-05-06 11:30:00',
    thanh_vien: 'Ngọc Hân, Nakagawa, Nhài',
    loai: 'moi'
  },
  {
    ref: 'A4',
    dau_moi: 'Nhài',
    nhiem_vu: 'A4 - Tổ chức tham quan lớp học Ô Cư 9:00-10:30 — 3 cấp độ (thấp/trung/cao 8+ tháng). HV tự giới thiệu tiếng Nhật nhuần nhuyễn, có giao lưu',
    chi_tieu: 'Cô hiểu tầm quan trọng học tiếng Nhật trước khi sang + quy mô đào tạo đa chuyên ngành',
    thoi_han: '2026-05-06 10:30:00',
    thanh_vien: 'Yamaoka',
    loai: 'moi'
  },
  {
    ref: 'A5',
    dau_moi: 'Ngọc Hân',
    nhiem_vu: 'A5 - Mời gia đình HV tham dự CẢ BUỔI SÁNG 06/05 (không chỉ 40 phút lễ): tiếp đón → tham quan cơ sở → khám/giao lưu → dự lễ',
    chi_tieu: 'Ít nhất 1 gia đình/chương trình; gia đình tăng niềm tin vào mô hình S2',
    thoi_han: '2026-04-28 17:00:00',  // Gửi thư mời kịp
    thanh_vien: 'Ly, Yui',
    loai: 'moi'
  },
  {
    ref: 'A6',
    dau_moi: 'Tín',
    nhiem_vu: 'A6 - Chọn 2-3 HV quay video 1 phút/em (mỗi chương trình 1 em: kỹ sư/nhân sự cao/chức năng). Nội dung: xuất thân + lý do đi Nhật + mục tiêu. Sau video em phát biểu trực tiếp trên sân khấu',
    chi_tieu: 'Video đa dạng chương trình, phụ đề tiếng Nhật, HV phát biểu tự tin',
    thoi_han: '2026-05-03 17:00:00',
    thanh_vien: 'Nhài, Duy',
    loai: 'moi'
  },
  {
    ref: 'A7',
    dau_moi: 'Satomura',
    nhiem_vu: 'A7 - Giới thiệu S2 + giao lưu nhân viên tiếng Nhật tại trụ sở chính (không thuyết trình dài). 3-5 đại diện BU chia sẻ bằng tiếng Nhật về hoài bão gắn bó S2; có số liệu khảo sát 20 năm',
    chi_tieu: 'Cô hình dung cụ thể mô hình S2 qua câu chuyện chiều sâu',
    thoi_han: '2026-04-22 17:00:00',   // Chốt NV tham gia trước thứ Tư
    thanh_vien: 'Utsumi',
    loai: 'moi'
  },
  {
    ref: 'A8',
    dau_moi: 'Ly',
    nhiem_vu: 'A8 - Đảm bảo an toàn (có LSQ đi kèm) + chuẩn bị quà lưu niệm + vệ sinh trang trí toàn công ty + tư thế đáp phòng NV + biển chào song ngữ',
    chi_tieu: 'Không sự cố an toàn; công ty gọn sạch; quà có ý nghĩa văn hóa',
    thoi_han: '2026-05-05 17:00:00',
    thanh_vien: 'Seno',
    loai: 'moi'
  },
  {
    ref: 'A9',
    dau_moi: 'Tuấn',
    nhiem_vu: 'A9 - Di chuyển (sân bay → khách sạn → Ô Cư → trụ sở) + Dịch kịch bản MC & phát biểu Lê Long Sơn & phát biểu HV sang tiếng Nhật → chiếu màn hình (không dịch miệng để tiết kiệm thời gian lễ 40 phút)',
    chi_tieu: 'Kịch bản MC dịch xong trong tuần này; di chuyển đúng giờ ngày 06/05',
    thoi_han: '2026-04-24 17:00:00',
    thanh_vien: '',
    loai: 'moi'
  },
  {
    ref: 'A10',
    dau_moi: 'Tín',
    nhiem_vu: 'A10 - Ghi hình + chụp ảnh toàn sự kiện + dựng phóng sự hậu kỳ + đăng SNS (mức mở: chờ TGĐ quyết) + chia sẻ đến toàn hệ thống trước & sau 06/05',
    chi_tieu: 'Phóng sự chất lượng; SNS đúng thông điệp; không lộ thông tin nhạy cảm',
    thoi_han: '2026-05-13 17:00:00',  // 1 tuần sau sự kiện
    thanh_vien: 'Yui',
    loai: 'moi'
  },
  {
    ref: 'A11',
    dau_moi: 'Hisano',
    nhiem_vu: 'A11 - Đầu mối Lãnh sự quán Nhật: xác nhận số lượng đoàn (Matsushima + chồng + 1-2 cán bộ LSQ), thủ tục đón cấp chính trị gia, yêu cầu nghi thức/an toàn, lịch bay',
    chi_tieu: 'Có văn bản xác nhận chính thức từ LSQ về thành phần đoàn',
    thoi_han: '2026-04-28 17:00:00',
    thanh_vien: '',
    loai: 'moi'
  },
  {
    ref: 'A12',
    dau_moi: 'Satomura',
    nhiem_vu: 'A12 - Sau lễ — gửi thư cảm ơn Cô Matsushima + báo cáo tổng kết cho ông Sasaki (cựu Cục trưởng Cục Di trú, người giới thiệu). Khép vòng tròn quan hệ',
    chi_tieu: 'Có thư cảm ơn + báo cáo tổng kết gửi cả 2 vị',
    thoi_han: '2026-05-13 17:00:00',
    thanh_vien: 'Shimizu, Utsumi',
    loai: 'moi'
  },

  // ===== NHÓM B — HÀNH TRÌNH TỈNH THỨC + PHÁ "CỔ CHAI" (3 chỉ đạo) =====
  {
    ref: 'B1',
    dau_moi: 'Satomura',  // Đại diện cho BOD — set 1 email cụ thể để WF1 gửi được
    nhiem_vu: 'B1 - Đưa nhân viên cấp dưới (DU có năng lực) vào buổi thứ Hai đầu tuần khi đơn vị mình trình bày. Mỗi buổi ≥3-5 NV cấp dưới có mặt. Áp dụng hàng tuần liên tục từ 27/04 — phá thắt nút cổ chai BOD',
    chi_tieu: 'NV giỏi được "thông hơi" thấy con đường tương lai trong S2, không bỏ việc. KPI: số NV cấp dưới gặp CEO/tuần',
    thoi_han: '2026-04-27 08:30:00',
    thanh_vien: 'Lanh, Ly, Tuấn, Tín, Masuda, Lê Anh Minh',
    loai: 'moi'
  },
  {
    ref: 'B2',
    dau_moi: 'Masuda',  // Case Thế Ngân Esutech
    nhiem_vu: 'B2 - Phát hiện NV trẻ có tiềm năng → phân loại A-B-C-D (HM19) → chủ động kéo các em A-B đi họp cùng sếp, gặp CEO nhiều hơn. CEO nêu case cụ thể: em Thế Ngân (Esutech) 7 năm chưa gặp CEO có nguy cơ nghỉ — cần xử lý trong tuần',
    chi_tieu: 'Mỗi BOD có danh sách người kế thừa dự kiến + lịch sử đã gặp CEO trong quý',
    thoi_han: '2026-04-27 17:00:00',  // Review hàng tuần bắt đầu
    thanh_vien: 'Satomura, Lanh, Tuấn, Tín, Ly, Lê Anh Minh',
    loai: 'leo_thang'
  },
  {
    ref: 'B3',
    dau_moi: 'Shimizu',
    nhiem_vu: 'B3 - Tiếp tục mở rộng "課題解決会" (Khóa giải quyết vấn đề) — đã chạy ~1 tháng. PDCA mỗi tuần. Đưa NV trẻ vào nhiều hơn. Rõ ràng: việc nào ai làm, khi nào xong',
    chi_tieu: 'Mỗi buổi có (1) vấn đề; (2) người chịu trách nhiệm; (3) deadline; (4) review tuần sau',
    thoi_han: null,  // Đã chạy liên tục, không deadline cụ thể
    thanh_vien: 'Yui, Utsumi',
    loai: 'bo_sung'
  },

  // ===== NHÓM C — ESUTECH (5 chỉ đạo) =====
  {
    ref: 'C1',
    dau_moi: 'Masuda',
    nhiem_vu: 'C1 - Ký MOU 3 bên S2 × Technohama × Lạc Hồng (26/04) + chuẩn bị 17 máy tính (15 SV Lạc Hồng + 2 kỹ sư OS Esutech học thiết kế khuôn mẫu). Cài phần mềm, lắp Ô Cư tháng 9/2026. Khai giảng lớp khuôn mẫu 01/2027',
    chi_tieu: 'MOU đủ chữ ký 3 bên; 17 máy cài đặt xong; SV học ngay từ ngày khai giảng',
    thoi_han: '2026-04-26 17:00:00',
    thanh_vien: 'Satomura, Lê Anh Minh, Tokuri',
    loai: 'moi'
  },
  {
    ref: 'C2',
    dau_moi: 'Ly',
    nhiem_vu: 'C2 - KHẨN: Họp riêng Ly × Lanh chốt dòng tiền Technohama trước khi ký MOU — làm rõ: chi phí dự án, ai ký hợp đồng (Esutech/S2 VN/S2 Japan), thu 5 triệu VND trước khóa (trả lại khi hoàn thành)',
    chi_tieu: 'Có văn bản thỏa thuận nội bộ về dòng tiền, TGĐ duyệt — blocker cho C1',
    thoi_han: '2026-04-20 20:00:00',
    thanh_vien: 'Lanh, Satomura, Masuda',
    loai: 'moi'
  },
  {
    ref: 'C3',
    dau_moi: 'Lê Anh Minh',
    nhiem_vu: 'C3 - Tổ chức buổi thuyết trình giới thiệu chương trình kỹ sư cho SV ĐH Khoa học + ký MOU cùng lúc',
    chi_tieu: 'Có SV tham dự; MOU ký kết',
    thoi_han: '2026-04-24 17:00:00',
    thanh_vien: 'Masuda',
    loai: 'moi'
  },
  {
    ref: 'C4',
    dau_moi: 'Masuda',
    nhiem_vu: 'C4 - Cập nhật data 366+ kỹ sư từ Excel lên BTIC (Bitrix24): thống nhất nhiều 名簿 thành 1 file quản lý chung, quản lý đủ trạng thái (đang học/nghỉ/giao lưu/bảo lưu) + dashboard giờ làm việc OS',
    chi_tieu: 'Mọi BOD xem dashboard theo thời gian thực; không lạc mất thông tin — HM43 hiện Blind spot, C4 thoát blind spot',
    thoi_han: '2026-05-31 17:00:00',
    thanh_vien: 'Thế Ngân, Tokuri',
    loai: 'leo_thang'
  },
  {
    ref: 'C5',
    dau_moi: 'Ly',
    nhiem_vu: 'C5 - Xác nhận đầu mối S2 Japan quản lý doanh thu OS — Ly đã chat Shimizu nhưng chưa có phản hồi. Họp trong tuần để đồng bộ dòng tiền VN × Nhật',
    chi_tieu: 'Có tên người + lịch họp hàng tuần giữa VN × Nhật',
    thoi_han: '2026-04-26 17:00:00',
    thanh_vien: 'Shimizu, Masuda',
    loai: 'moi'
  },

  // ===== NHÓM D — CHIẾN LƯỢC TUYỂN SINH "FUTURE MONEY" (3 chỉ đạo) =====
  {
    ref: 'D1',
    dau_moi: 'Linh',   // CHƯA RÕ EMAIL — fallback
    nhiem_vu: 'D1 - Áp dụng chiến lược "thu nhập tương lai" (未来のお金) toàn MSA: thay poster cũ (lương 20-25 man/tháng + N3-N2) bằng poster mới ("10 năm nữa bạn có thể 1.5T/năm không?"). Pilot Đà Nẵng (CED 2026 - 18/04) đã thành công — rollout toàn quốc',
    chi_tieu: 'Mỗi vùng có ≥1 mẫu poster mới; đo lường conversion; tuyển sinh chuyên ngành xây dựng đạt chỉ tiêu',
    thoi_han: '2026-05-31 17:00:00',
    thanh_vien: 'Hải',
    loai: 'moi'
  },
  {
    ref: 'D2',
    dau_moi: 'Linh',
    nhiem_vu: 'D2 - STECH đồng hành sponsor các event đại học kỹ thuật: list tất cả cuộc thi/event, tham gia sponsor/gian hàng, làm backdrop mới có đồ thị thu nhập 5-10-20 năm. "Xuất hiện thường xuyên" là branding hiệu quả',
    chi_tieu: 'Danh sách event toàn quốc + kế hoạch tham gia; đo số SV tiếp cận qua event',
    thoi_han: '2026-06-01 17:00:00',
    thanh_vien: 'Hải',
    loai: 'moi'
  },
  {
    ref: 'D3',
    dau_moi: 'Linh',
    nhiem_vu: 'D3 - Chuyển giao chiến lược "future money" từ kỹ sư sang 3 mảng: Thực tập sinh + Đào tạo 育成就労 + Tokutei ginou 特定技能 (còn ~15.000 suất tại Nhật, đặc biệt ngành bảo trì ô tô)',
    chi_tieu: 'Mỗi mảng có (1) poster future money; (2) kịch bản tư vấn; (3) KPI conversion',
    thoi_han: '2026-06-30 17:00:00',
    thanh_vien: 'Hải',
    loai: 'moi'
  },

  // ===== NHÓM E — ĐỊNH HƯỚNG VĂN HÓA (2 chỉ đạo) =====
  {
    ref: 'E1',
    dau_moi: 'Ly',  // BOD đại diện văn hóa nội bộ
    nhiem_vu: 'E1 - Triển khai chính sách giảm xem video ngắn + lướt SNS không mục đích trong giờ làm việc. TGĐ đã có ý định "cấm video ngắn" từ trước — BOD cụ thể hóa thành chính sách. Tăng làm việc sâu 60-90 phút không ngắt',
    chi_tieu: 'Có văn bản chính sách; đào tạo BOD/trưởng BU truyền thông lại cho NV',
    thoi_han: '2026-05-31 17:00:00',
    thanh_vien: 'Satomura, Lanh, Tuấn, Tín',
    loai: 'moi'
  },
  {
    ref: 'E2',
    dau_moi: 'Shimizu',
    nhiem_vu: 'E2 - Chuyển định hướng quản trị từ "kích dopamine ngắn hạn" (lời khen, KPI tháng, thưởng nóng) sang "nuôi endorphin dài hạn" (chức vụ, ý nghĩa tồn tại, hành trình trăm năm) cho NV trưởng thành 30-50+ tuổi',
    chi_tieu: 'Định hướng được áp dụng trong KPI, chính sách lương 3P, câu chuyện truyền thông nội bộ',
    thoi_han: null,  // Định hướng dài hạn
    thanh_vien: 'Satomura, Ly, Lanh, Tuấn, Tín, Masuda',
    loai: 'moi'
  }
];

// ==================================================================

async function run() {
  console.log(`\n📥 Insert BOD 2026-04-20 — ${items.length} chỉ đạo`);
  console.log(`   Mode: ${DRY_RUN ? '🧪 DRY RUN' : '🔴 LIVE'}`);
  console.log(`   Policy: WF1 STEP1 PASS (approved_by='BOD_20042026'), STEP2 sẽ gửi email xác nhận cho đầu mối`);
  console.log('');

  const now = new Date().toISOString();
  let ok = 0, fail = 0;
  const insertedIds = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const code = `DR-20260420-${(i + 1).toString().padStart(3, '0')}`;

    const row = {
      directive_code: code,
      t1_dau_moi: item.dau_moi,
      t2_nhiem_vu: item.nhiem_vu,
      t3_chi_tieu: item.chi_tieu || null,
      t4_thoi_han: item.thoi_han,
      t5_thanh_vien: item.thanh_vien
        ? item.thanh_vien.split(',').map(s => s.trim()).filter(Boolean)
        : null,
      loai: item.loai,
      meeting_source: 'BOD 2026-04-20',
      lls_step: 1,
      tinh_trang: 'cho_xu_ly',
      // === WF1 STEP1 PASS ===
      approved_by: 'BOD_20042026',
      approved_at: now,
      // === WF1 STEP2 CHƯA ===
      // confirmed_by: null, confirmed_at: null (không set)
    };

    if (DRY_RUN) {
      console.log(`🧪 [${code}] ${item.ref} → đầu mối: ${item.dau_moi} | deadline: ${item.thoi_han || '(không)'}`);
      ok++;
      continue;
    }

    try {
      const inserted = await supabaseInsert('directives', row);
      const directiveId = inserted?.[0]?.id;
      if (directiveId) insertedIds.push({ id: directiveId, code, ref: item.ref });

      // Ghi lls_step_history: record "BOD duyệt mặc định pass"
      if (directiveId) {
        await supabaseInsert('lls_step_history', {
          directive_id: directiveId,
          step_number: 1,
          step_name: 'BOD duyệt',
          action: 'auto_pass',
          actor: 'BOD_20042026',
          detail: 'Chỉ đạo trực tiếp từ BOD 20/04/2026 — mặc định pass WF1 STEP1, chờ đầu mối xác nhận 5T ở STEP2'
        });
      }

      console.log(`✅ [${code}] ${item.ref} đã insert + log history`);
      ok++;
    } catch (e) {
      console.log(`❌ [${code}] ${item.ref} LỖI: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n📊 Kết quả: ${ok}/${items.length} thành công, ${fail} lỗi`);
  if (!DRY_RUN && ok > 0) {
    console.log(`\n▶ Bước tiếp theo: chạy WF1 để gửi email xác nhận cho đầu mối:`);
    console.log(`   cd automation && node wf1-approval.js --dry-run    # Preview email trước`);
    console.log(`   cd automation && node wf1-approval.js              # Gửi thật`);
  }
}

run().catch(e => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});
