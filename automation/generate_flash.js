require('dotenv').config();
const { db } = require('./lib/supabase-client');
const fs = require('fs');

async function run() {
  console.log("Fetching live data from Supabase...");
  const { data, error } = await db
    .from('ceo_directives')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Lỗi fetch Supabase:", error);
    process.exit(1);
  }

  const activeCount = data.filter(d => !['hoan_thanh', 'hoan_thanh_tre', 'da_huy'].includes(d.tinh_trang)).length;
  const doneCount = data.filter(d => ['hoan_thanh', 'hoan_thanh_tre'].includes(d.tinh_trang)).length;
  
  const overdueCount = data.filter(d => {
    if (!d.t4_thoi_han) return false;
    if (['hoan_thanh', 'da_huy', 'tam_hoan'].includes(d.tinh_trang)) return false;
    const daysOverdue = Math.ceil((new Date() - new Date(d.t4_thoi_han)) / (1000 * 60 * 60 * 24));
    return daysOverdue > 0;
  }).length;

  const noResponse = data.filter(d => !d.t4_thoi_han && !['hoan_thanh', 'da_huy'].includes(d.tinh_trang)).length;

  const md = `
# ⚡ FLASH REPORT: CHỈ ĐẠO BQT 
*Báo cáo được trích xuất TỰ ĐỘNG trực tiếp từ CSDL Supabase lúc ${new Date().toLocaleTimeString('vi-VN')}*

> [!IMPORTANT]
> **TỔNG QUAN HỆ THỐNG**
> Tổng số chỉ đạo toàn hệ thống: **${data.length}** 
> - Hoàn thành: **${doneCount}**
> - Đang triển khai: **${activeCount}**
> - Thiếu deadline (Chưa phản hồi): **${noResponse}**

---

### 🚨 BÁO ĐỘNG ĐỎ: CHỈ ĐẠO QUÁ HẠN (${overdueCount})
*(Đây là những chỉ đạo cần xoáy sâu trong 15 phút mở họp)*

${data.filter(d => {
  if (!d.t4_thoi_han) return false;
  if (['hoan_thanh', 'da_huy', 'tam_hoan'].includes(d.tinh_trang)) return false;
  return Math.ceil((new Date() - new Date(d.t4_thoi_han)) / (1000 * 60 * 60 * 24)) > 0;
}).slice(0, 10).map(d => `- **[${d.t1_dau_moi || 'N/A'}]** - *${d.t2_nhiem_vu || d.directive_code}* (Quá hạn từ ${d.t4_thoi_han})`).join('\n') || '- Tuyệt vời, không có chỉ đạo nào quá hạn nghiêm trọng!'}

---

### 🟡 THIẾU TÍN HIỆU: CHƯA CHỐT DEADLINE (${noResponse})
*(Anh cần yêu cầu các Lãnh đạo cam kết mốc thời gian rõ ràng ngay trên bàn họp)*
${data.filter(d => !d.t4_thoi_han && !['hoan_thanh', 'da_huy'].includes(d.tinh_trang)).slice(0, 5).map(d => `- **[${d.t1_dau_moi || 'N/A'}]**: *${(d.t2_nhiem_vu || d.directive_code || '').substring(0, 80)}...*`).join('\n')}
${noResponse > 5 ? '... (và ' + (noResponse - 5) + ' mục khác)' : ''}

---
*Ghi chú cho anh Kha: Dữ liệu này là thực tế 100%. Hãy cầm bản report này, nhìn thẳng vào người phụ trách và đọc dõng dạc. Mọi thứ đang dưới quyền kiểm soát của anh!*
`;

  fs.writeFileSync('/Users/esuhai/.gemini/antigravity/brain/9d1e738b-d4ae-4b51-b7e6-31c9555037e5/flash_report_bqt.md', md.trim());
  console.log("✅ Flash report generated!");
}

run();
