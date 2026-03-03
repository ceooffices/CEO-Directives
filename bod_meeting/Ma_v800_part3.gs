// =============================================================================
// SEND APPROVAL RESULTS (ANTI-SPAM)
// =============================================================================
function sendApprovalResults() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mauBieu = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ui = SpreadsheetApp.getUi();
  if (!mauBieu) {
    ui.alert("Không tìm thấy tab!");
    return;
  }
  const resp = ui.prompt(
    "📧 Gửi kết quả duyệt",
    "Nhập ngày họp (VD: 27/01):",
    ui.ButtonSet.OK_CANCEL,
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const searchDate = resp.getResponseText().trim();
  if (!searchDate) {
    ui.alert("Vui lòng nhập ngày họp!");
    return;
  }
  const cols = CONFIG.COLUMN_MAP;
  const data = mauBieu.getDataRange().getValues();
  let sent = 0,
    skipped = 0,
    alreadySent = 0,
    failed = 0;
  const btcEmails = getBTCEmails();
  const details = [];
  const now = new Date();
  const timestamp = Utilities.formatDate(
    now,
    "Asia/Ho_Chi_Minh",
    "dd/MM HH:mm",
  );
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!matchNgayHop(row[cols.ngayHop], searchDate)) continue;
    const email = (row[cols.email] || "").toString().trim();
    const status = (row[cols.status] || "").toString().trim();
    const hoTen = toTitleCase(row[cols.hoTen]) || "N/A";
    const daGui = (row[cols.daGuiEmail] || "").toString().trim();
    if (daGui) {
      alreadySent++;
      details.push("Row " + (i + 1) + ": ⏭️ Đã gửi (" + hoTen + ")");
      continue;
    }
    if (!email || !isValidEmail(email)) {
      skipped++;
      continue;
    }
    if (!status || status === "Chờ duyệt") {
      skipped++;
      continue;
    }
    const emailInput = {
      hoTen,
      noiDung: row[cols.noiDung] || "",
      ngayHop: formatNgayHop(row[cols.ngayHop]),
      boPhan: row[cols.boPhan] || "",
      ghiChu: row[cols.ghiChu] || "",
    };
    let emailData;
    if (status === "Duyệt") emailData = buildEmailApproved(emailInput);
    else if (status === "Từ chối") emailData = buildEmailRejected(emailInput);
    else if (status === "Hoãn") emailData = buildEmailPostponed(emailInput);
    else {
      skipped++;
      continue;
    }
    const ccList = [...btcEmails.all];
    const emailLQ = row[cols.emailLienQuan];
    if (emailLQ)
      emailLQ
        .toString()
        .split(/[,;\n]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => isValidEmail(e))
        .forEach((e) => ccList.push(e));
    if (sent > 0) Utilities.sleep(CONFIG.EMAIL_DELAY_MS);
    if (
      sendEmail({
        to: email,
        cc: [...new Set(ccList)].join(","),
        subject: emailData.subject,
        body: emailData.body,
      })
    ) {
      sent++;
      details.push("Row " + (i + 1) + ": ✔︎ → " + email);
      mauBieu.getRange(i + 1, cols.daGuiEmail + 1).setValue("✔︎ " + timestamp);
    } else {
      failed++;
      details.push("Row " + (i + 1) + ": ❌ → " + email);
    }
  }
  if (sent === 0 && skipped === 0 && failed === 0 && alreadySent === 0) {
    ui.alert("Không tìm thấy đăng ký cho ngày " + searchDate + "!");
    return;
  }
  let summary = "📧 KẾT QUẢ GỬI EMAIL\n\n✔︎ Gửi mới: " + sent + "\n";
  if (alreadySent > 0) summary += "⏭️ Đã gửi trước: " + alreadySent + "\n";
  if (failed > 0) summary += "❌ Thất bại: " + failed + "\n";
  if (skipped > 0) summary += "⏭️ Bỏ qua: " + skipped + "\n";
  summary += "\n" + details.slice(0, 15).join("\n");
  if (alreadySent > 0) summary += '\n\n💡 Cần gửi lại? Dùng "Reset gửi email"';
  ui.alert(summary);
}

// =============================================================================
// TRIGGERS
// =============================================================================
function createTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (["onFormSubmit", "onEditHandler"].includes(t.getHandlerFunction()))
      ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  ScriptApp.newTrigger("onEditHandler").forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi().alert("✅ Đã tạo Triggers!");
}

function onFormSubmit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  if (!sheet) return;
  const cols = CONFIG.COLUMN_MAP;
  const lastRow = sheet.getLastRow();
  if (!sheet.getRange(lastRow, cols.status + 1).getValue())
    sheet.getRange(lastRow, cols.status + 1).setValue("Chờ duyệt");
  if (!sheet.getRange(lastRow, cols.thoiLuongChiDao + 1).getValue()) {
    const bp = sheet.getRange(lastRow, cols.boPhan + 1).getValue();
    sheet
      .getRange(lastRow, cols.thoiLuongChiDao + 1)
      .setValue(getDefaultChiDaoTime(bp) + " phút");
  }
  const emailLQ = sheet.getRange(lastRow, cols.emailLienQuan + 1).getValue();
  if (emailLQ && emailLQ.toString().trim())
    sheet
      .getRange(lastRow, cols.tenLienQuan + 1)
      .setValue(lookupNamesFromEmailList(emailLQ));
  sheet
    .getRange(lastRow, cols.hoTen + 1)
    .setValue(toTitleCase(sheet.getRange(lastRow, cols.hoTen + 1).getValue()));
  try {
    const rowData = sheet
      .getRange(lastRow, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const emailData = buildEmailNewRegistration({
      hoTen: rowData[cols.hoTen] || "N/A",
      boPhan: rowData[cols.boPhan] || "N/A",
      noiDung: rowData[cols.noiDung] || "N/A",
      ngayHop: formatNgayHop(rowData[cols.ngayHop]) || "N/A",
      thoiLuong: rowData[cols.thoiLuong] || "N/A",
      sheetUrl: ss.getUrl(),
    });
    sendEmail({
      to: getBTCEmails().all.join(","),
      subject: emailData.subject,
      body: emailData.body,
    });
  } catch (e) {
    Logger.log("Notification error: " + e.message);
  }
}

function onEditHandler(e) {
  try {
    if (!e || !e.range) return;
    if (e.source.getActiveSheet().getName() === CONFIG.SHEET_RESPONSES)
      updateDashboardTimestamp();
  } catch (e) {}
}

function updateDashboardTimestamp() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      CONFIG.SHEET_REVIEW,
    );
    if (!sheet) return;
    sheet
      .getRange(CONFIG.DASHBOARD_TIMESTAMP_ROW, 5)
      .setValue(
        "Cập nhật: " +
          Utilities.formatDate(
            new Date(),
            "Asia/Ho_Chi_Minh",
            "HH:mm:ss d/M/yyyy",
          ),
      );
  } catch (e) {}
}

// =============================================================================
// SECRETARY APPROVE & SEND SCHEDULE
// =============================================================================
function getDetailedStatsWithDepts(searchDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const requiredDepts = [
    "KOKA TEAM",
    "IDS",
    "MSA",
    "JPC",
    "KAIZEN",
    "ALESU",
    "PROSKILLS",
    "ESUTECH",
    "ESUWORKS",
  ];
  const result = {
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    postponed: 0,
    requiredDepts,
    requiredRegistered: [],
    requiredMissing: [],
    deptStats: {},
  };
  if (!sheet) return result;
  const cols = CONFIG.COLUMN_MAP;
  const data = sheet.getDataRange().getValues();
  const registered = new Set();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!matchNgayHop(row[cols.ngayHop], searchDate)) continue;
    result.total++;
    const status = (row[cols.status] || "").toString().trim();
    const bp = (row[cols.boPhan] || "").toString().trim().toUpperCase();
    registered.add(bp);
    if (status === "Duyệt") result.approved++;
    else if (status === "Từ chối") result.rejected++;
    else if (status === "Hoãn") result.postponed++;
    else result.pending++;
    if (!result.deptStats[bp]) result.deptStats[bp] = { total: 0, approved: 0 };
    result.deptStats[bp].total++;
    if (status === "Duyệt") result.deptStats[bp].approved++;
  }
  requiredDepts.forEach((d) => {
    if (registered.has(d.toUpperCase()) || registered.has(d))
      result.requiredRegistered.push(d);
    else result.requiredMissing.push(d);
  });
  return result;
}

function secretaryApproveV78() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  const ui = SpreadsheetApp.getUi();
  if (!scheduleSheet) {
    ui.alert("Không tìm thấy tab Lịch trình!");
    return;
  }
  const banner = scheduleSheet.getRange("A3").getValue();
  if (banner && banner.toString().includes("ĐÃ DUYỆT")) {
    ui.alert("Lịch trình đã được duyệt!\n" + banner);
    return;
  }
  const ngayHopRaw = scheduleSheet.getRange("A8").getValue();
  const ngayHopDisplay = formatNgayHop(ngayHopRaw);
  const searchDate = extractSearchDate(ngayHopRaw);
  const stats = getDetailedStatsWithDepts(searchDate);
  let msg =
    "📅 " +
    ngayHopDisplay +
    "\n\n📊 Tổng: " +
    stats.total +
    " | Duyệt: " +
    stats.approved +
    " | Chờ: " +
    stats.pending +
    " | Từ chối/Hoãn: " +
    (stats.rejected + stats.postponed) +
    "\n\n";
  msg +=
    "🏢 Phòng ban bắt buộc: " +
    stats.requiredRegistered.length +
    "/" +
    stats.requiredDepts.length +
    "\n";
  if (stats.requiredMissing.length > 0)
    msg += "⚠️ Chưa đăng ký: " + stats.requiredMissing.join(", ") + "\n";
  msg += "\n[CÓ] → GỬI LỊCH TRÌNH\n[KHÔNG] → GỬI NHẮC NHỞ";
  const choice = ui.alert(
    "✔︎ XÁC NHẬN GỬI LỊCH TRÌNH",
    msg,
    ui.ButtonSet.YES_NO_CANCEL,
  );
  if (choice === ui.Button.YES) sendScheduleNow(scheduleSheet, stats);
  else if (choice === ui.Button.NO) {
    if (stats.requiredMissing.length === 0) {
      ui.alert("Đã đầy đủ!");
      return;
    }
    sendReminderToMissingDepts(stats.requiredMissing, ngayHopDisplay);
  }
}

function sendScheduleNow(scheduleSheet, stats) {
  const ui = SpreadsheetApp.getUi();
  try {
    const ts = Utilities.formatDate(
      new Date(),
      "Asia/Ho_Chi_Minh",
      "dd/MM/yyyy HH:mm",
    );
    scheduleSheet
      .getRange("A3")
      .setValue(
        CONFIG.STATUS_APPROVED + " bởi " + CONFIG.SECRETARY_NAME + " lúc " + ts,
      );
    const count = sendScheduleEmail();
    ui.alert("✔︎ Đã xác nhận & gửi đến " + count + " người!");
  } catch (e) {
    ui.alert("❌ Lỗi: " + e.message);
  }
}

function sendReminderToMissingDepts(missingDepts, ngayHopDisplay) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const nhanSuSheet = ss.getSheetByName("Nhân sự bắt buộc");
  if (!nhanSuSheet) {
    ui.alert('Không tìm thấy tab "Nhân sự bắt buộc"!');
    return;
  }
  const data = nhanSuSheet.getDataRange().getValues();
  const emailMap = {};
  for (let i = 1; i < data.length; i++) {
    const bp = (data[i][0] || "").toString().trim().toUpperCase();
    const email = (data[i][1] || "").toString().trim();
    if (bp && email && isValidEmail(email)) emailMap[bp] = email;
  }
  const toSend = [],
    withEmail = [],
    withoutEmail = [];
  missingDepts.forEach((d) => {
    if (emailMap[d.toUpperCase()]) {
      toSend.push(emailMap[d.toUpperCase()]);
      withEmail.push(d);
    } else withoutEmail.push(d);
  });
  if (toSend.length === 0) {
    ui.alert("Không tìm thấy email!");
    return;
  }
  let cfm = "Gửi nhắc nhở đến:\n";
  withEmail.forEach((d, i) => {
    cfm += "• " + d + ": " + toSend[i] + "\n";
  });
  if (ui.alert("📬 XÁC NHẬN", cfm, ui.ButtonSet.YES_NO) !== ui.Button.YES)
    return;
  try {
    const subject = "[NHẮC NHỞ] Đăng ký BOD - " + ngayHopDisplay;
    const body =
      "Kính gửi Anh/Chị,\n\nBộ phận của Anh/Chị CHƯA ĐĂNG KÝ báo cáo cho cuộc họp BOD.\n📅 Ngày họp: " +
      ngayHopDisplay +
      "\n⏰ 08:30\n\nVui lòng đăng ký sớm.\n\nTrân trọng,\nBan Thư ký Meeting BOD";
    let sentCount = 0;
    toSend.forEach((email, i) => {
      try {
        if (i > 0) Utilities.sleep(CONFIG.EMAIL_DELAY_MS);
        GmailApp.sendEmail(email, subject, body, {
          name: "BTC Meeting BOD",
          cc: "hoangkha@esuhai.com",
        });
        sentCount++;
      } catch (e) {}
    });
    ui.alert("✔︎ Đã gửi " + sentCount + "/" + toSend.length + " email!");
  } catch (e) {
    ui.alert("❌ Lỗi: " + e.message);
  }
}

function sendScheduleEmail() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scheduleSheet = ss.getSheetByName(CONFIG.SHEET_SCHEDULE);
  const mauBieu = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  const ngayHopRaw = scheduleSheet.getRange("A8").getValue();
  const searchDate = extractSearchDate(ngayHopRaw);
  const meetingCfg = getMeetingConfig();
  let agendaList = "";
  for (let i = CONFIG.AGENDA_START_ROW; i <= CONFIG.AGENDA_END_ROW; i++) {
    const content = scheduleSheet.getRange(i, 3).getValue();
    if (content && content.toString().trim()) {
      agendaList +=
        scheduleSheet.getRange(i, 1).getValue() +
        ". " +
        formatTime(scheduleSheet.getRange(i, 2).getValue()) +
        "  " +
        content +
        "\n   Trình bày: " +
        scheduleSheet.getRange(i, 4).getValue() +
        "\n\n";
    }
  }
  const cols = CONFIG.COLUMN_MAP;
  const data = mauBieu.getDataRange().getValues();
  const btcEmails = getBTCEmails();
  const emails = new Set(btcEmails.all.map((e) => e.toLowerCase()));
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (
      matchNgayHop(row[cols.ngayHop], searchDate) &&
      row[cols.status] === "Duyệt"
    ) {
      const e = (row[cols.email] || "").toString().trim().toLowerCase();
      if (isValidEmail(e)) emails.add(e);
      if (row[cols.emailLienQuan])
        row[cols.emailLienQuan]
          .toString()
          .split(/[,;\n]+/)
          .map((x) => x.trim().toLowerCase())
          .filter((x) => isValidEmail(x))
          .forEach((x) => emails.add(x));
    }
  }
  const exportUrl =
    "https://docs.google.com/spreadsheets/d/" +
    ss.getId() +
    "/export?format=pdf&size=A4&portrait=false&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenumbers=false&fzr=false&gid=" +
    scheduleSheet.getSheetId();
  const pdfBlob = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
  }).getBlob();
  pdfBlob.setName("Lich_trinh_BOD_" + searchDate.replace("/", "_") + ".pdf");
  const emailData = buildEmailSchedule({
    ngayHop: formatNgayHop(ngayHopRaw),
    gioHop: formatTime(meetingCfg.gioHop),
    diaDiem: meetingCfg.diaDiem,
    teamsLink: meetingCfg.teamsLink,
    agendaList: agendaList || "(Chưa có nội dung)\n",
  });
  sendEmailWithAttachment(
    {
      to: Array.from(emails).join(","),
      subject: emailData.subject,
      body: emailData.body,
    },
    pdfBlob,
  );
  return emails.size;
}

// =============================================================================
// REFRESH DASHBOARD V8.0
// =============================================================================
function refreshDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName("Dashboard");
  const ui = SpreadsheetApp.getUi();
  if (!dashboard) {
    ui.alert("Không tìm thấy tab Dashboard!");
    return;
  }
  const mondays = getNext4MondaysFromToday();
  for (let i = 0; i < 4; i++) {
    const r = 8 + i,
      s = mondays[i].search;
    dashboard.getRange(r, 1).setValue(mondays[i].label);
    dashboard
      .getRange(r, 2)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          s +
          '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*1)',
      );
    dashboard
      .getRange(r, 3)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          s +
          '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(\'Form Đăng ký\'!L:L="Duyệt")*1)',
      );
    dashboard
      .getRange(r, 4)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          s +
          '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(\'Form Đăng ký\'!L:L="Từ chối")*1)',
      );
    dashboard
      .getRange(r, 5)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          s +
          '";TEXT(\'Form Đăng ký\'!H:H;"DD/MM"))))*(\'Form Đăng ký\'!L:L="Hoãn")*1)',
      );
    dashboard
      .getRange(r, 6)
      .setFormula("=B" + r + "-C" + r + "-D" + r + "-E" + r);
  }
  dashboard
    .getRange(7, 1, 1, 6)
    .setValues([["Ngày họp", "Tổng", "Duyệt", "Từ chối", "Hoãn", "Chờ"]]);
  dashboard
    .getRange(14, 1, 1, 6)
    .setValues([["Bộ phận", "Tổng", "Duyệt", "Từ chối", "Hoãn", "Chờ"]]);
  refreshDeptStats(dashboard, mondays[0].search);
  dashboard
    .getRange(36, 5)
    .setValue(
      "Cập nhật: " +
        Utilities.formatDate(
          new Date(),
          "Asia/Ho_Chi_Minh",
          "HH:mm:ss d/M/yyyy",
        ),
    );
  try {
    highlightUpcomingWeekDashboard();
  } catch (e) {}
  ui.alert(
    "✅ Dashboard đã cập nhật!\n\n" +
      mondays.map((m) => "• " + m.label).join("\n"),
  );
}

function getNext4MondaysFromToday() {
  const mondays = [];
  const today = new Date();
  const day = today.getDay();
  let diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  let next = new Date(today);
  next.setDate(today.getDate() + diff);
  for (let i = 0; i < 4; i++) {
    const d = next.getDate().toString().padStart(2, "0");
    const m = (next.getMonth() + 1).toString().padStart(2, "0");
    mondays.push({
      label: "Thứ 2, " + d + "/" + m + "/" + next.getFullYear(),
      search: d + "/" + m,
      date: new Date(next),
    });
    next = new Date(next);
    next.setDate(next.getDate() + 7);
  }
  return mondays;
}

function refreshDeptStats(dashboard, searchStr) {
  const depts = {
    15: "BOD",
    16: "KOKA TEAM",
    17: "IDS",
    18: "MSA",
    19: "JPC",
    20: "KAIZEN",
    21: "BAN CỐ VẤN",
    22: "BAN ĐỐI NGOẠI",
    23: "HR",
    24: "TÀI CHÍNH KẾ TOÁN",
    25: "TỔNG HỢP",
    26: "ALESU",
    27: "PROSKILLS",
    28: "ESUTECH",
    29: "ESUWORKS",
    30: "ESUWELL",
    31: "PHÁP CHẾ",
    32: "BAN TRỢ LÝ",
    33: "GATE AWARDS",
  };
  for (const [rowStr, name] of Object.entries(depts)) {
    const r = parseInt(rowStr),
      u = name.toUpperCase();
    dashboard
      .getRange(r, 2)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          searchStr +
          "\";TEXT('Form Đăng ký'!H:H;\"DD/MM\"))))*(UPPER('Form Đăng ký'!K:K)=\"" +
          u +
          '")*1)',
      );
    dashboard
      .getRange(r, 3)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          searchStr +
          "\";TEXT('Form Đăng ký'!H:H;\"DD/MM\"))))*(UPPER('Form Đăng ký'!K:K)=\"" +
          u +
          '")*(\'Form Đăng ký\'!L:L="Duyệt")*1)',
      );
    dashboard
      .getRange(r, 4)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          searchStr +
          "\";TEXT('Form Đăng ký'!H:H;\"DD/MM\"))))*(UPPER('Form Đăng ký'!K:K)=\"" +
          u +
          '")*(\'Form Đăng ký\'!L:L="Từ chối")*1)',
      );
    dashboard
      .getRange(r, 5)
      .setFormula(
        '=SUMPRODUCT((ISNUMBER(SEARCH("' +
          searchStr +
          "\";TEXT('Form Đăng ký'!H:H;\"DD/MM\"))))*(UPPER('Form Đăng ký'!K:K)=\"" +
          u +
          '")*(\'Form Đăng ký\'!L:L="Hoãn")*1)',
      );
    dashboard
      .getRange(r, 6)
      .setFormula("=B" + r + "-C" + r + "-D" + r + "-E" + r);
  }
}
