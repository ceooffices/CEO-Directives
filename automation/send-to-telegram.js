#!/usr/bin/env node
/**
 * send-to-telegram.js
 * Headless CLI — gửi file hoặc text qua Telegram bot, rồi thoát.
 * Không polling, không conflict với telegram-bot.js.
 *
 * Usage:
 *   node send-to-telegram.js --file <path> [--caption "Mô tả"]
 *   node send-to-telegram.js --text "Tin nhắn"
 *   node send-to-telegram.js --file report.html --chat 123456789
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// ===== CONFIG =====
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.ADMIN_CHAT_ID || process.env.ADMIN_USER_IDS;

if (!BOT_TOKEN) {
  console.error('✖ TELEGRAM_BOT_TOKEN không có trong .env');
  process.exit(1);
}

// ===== PARSE ARGS =====
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { file: null, caption: null, text: null, chat: DEFAULT_CHAT_ID };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        opts.file = args[++i];
        break;
      case '--caption':
      case '-c':
        opts.caption = args[++i];
        break;
      case '--text':
      case '-t':
        opts.text = args[++i];
        break;
      case '--chat':
        opts.chat = args[++i];
        break;
    }
  }

  if (!opts.file && !opts.text) {
    console.error('Usage:');
    console.error('  node send-to-telegram.js --file <path> [--caption "Mô tả"]');
    console.error('  node send-to-telegram.js --text "Tin nhắn"');
    process.exit(1);
  }

  if (!opts.chat) {
    console.error('✖ Không tìm thấy ADMIN_CHAT_ID trong .env và không có --chat');
    process.exit(1);
  }

  return opts;
}

// ===== IMAGE EXTENSIONS =====
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

// ===== MAIN =====
async function main() {
  const opts = parseArgs();
  // Không polling — chỉ gọi API rồi thoát
  const bot = new TelegramBot(BOT_TOKEN);

  try {
    if (opts.text) {
      // Gửi tin nhắn text
      await bot.sendMessage(opts.chat, opts.text, { parse_mode: 'HTML' });
      console.log(`✅ Đã gửi tin nhắn → chat ${opts.chat}`);
    } else if (opts.file) {
      // Kiểm tra file tồn tại
      const filePath = path.resolve(opts.file);
      if (!fs.existsSync(filePath)) {
        console.error(`✖ File không tồn tại: ${filePath}`);
        process.exit(1);
      }

      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      const caption = opts.caption || `📎 ${fileName}`;
      const fileSize = fs.statSync(filePath).size;

      console.log(`📤 Đang gửi: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)...`);

      if (IMAGE_EXTS.has(ext)) {
        // Gửi ảnh
        await bot.sendPhoto(opts.chat, filePath, { caption });
        console.log(`✅ Đã gửi ảnh → chat ${opts.chat}`);
      } else {
        // Gửi document (HTML, MD, PDF, TXT, ...)
        await bot.sendDocument(opts.chat, filePath, { caption }, {
          filename: fileName,
          contentType: getContentType(ext),
        });
        console.log(`✅ Đã gửi file → chat ${opts.chat}`);
      }
    }
  } catch (err) {
    console.error(`✖ Lỗi gửi Telegram: ${err.message}`);
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      console.error('💡 Bot token có thể đã bị revoke. Tạo token mới qua @BotFather.');
    }
    if (err.message.includes('chat not found')) {
      console.error(`💡 Chat ID ${opts.chat} không hợp lệ. Gửi /start cho bot trước.`);
    }
    process.exit(1);
  }

  process.exit(0);
}

function getContentType(ext) {
  const map = {
    '.html': 'text/html',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.csv': 'text/csv',
  };
  return map[ext] || 'application/octet-stream';
}

main();
