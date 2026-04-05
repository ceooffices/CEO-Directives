/**
 * ecosystem.config.js
 * PM2 Configuration — CEO Directive Automation
 *
 * Usage:
 *   pm2 start ecosystem.config.js     # Start all services
 *   pm2 stop all                      # Stop all
 *   pm2 restart all                   # Restart all
 *   pm2 logs                          # View all logs
 *   pm2 monit                         # Live monitoring dashboard
 */

const path = require('path');
const AUTO_DIR = __dirname;

module.exports = {
  apps: [
    // ===== 1. NemoClaw Bridge (API Gateway) — phải chạy trước =====
    {
      name: 'ceo-bridge',
      script: path.join(AUTO_DIR, 'nemoclaw-bridge.js'),
      cwd: AUTO_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
      // Log config
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(AUTO_DIR, 'logs/ceo-bridge-error.log'),
      out_file: path.join(AUTO_DIR, 'logs/ceo-bridge-out.log'),
      merge_logs: true,
      log_type: 'json',
    },

    // ===== 2. Telegram Bot — chờ Bridge sẵn sàng =====
    {
      name: 'ceo-bot',
      script: path.join(AUTO_DIR, 'telegram-bot.js'),
      cwd: AUTO_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,        // chờ 5s sau khi crash trước khi restart
      wait_ready: false,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(AUTO_DIR, 'logs/ceo-bot-error.log'),
      out_file: path.join(AUTO_DIR, 'logs/ceo-bot-out.log'),
      merge_logs: true,
      log_type: 'json',
    },

    // ===== 3. Scheduler (Cron Jobs WF1-6) =====
    {
      name: 'ceo-scheduler',
      script: path.join(AUTO_DIR, 'scheduler.js'),
      cwd: AUTO_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '300M',  // scheduler có thể tốn RAM hơn khi gọi AI
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(AUTO_DIR, 'logs/ceo-scheduler-error.log'),
      out_file: path.join(AUTO_DIR, 'logs/ceo-scheduler-out.log'),
      merge_logs: true,
      log_type: 'json',
    },

    // ===== 4. Control Panel (Web UI) =====
    {
      name: 'ceo-panel',
      script: path.join(AUTO_DIR, 'control-panel.js'),
      cwd: AUTO_DIR,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      watch: false,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(AUTO_DIR, 'logs/ceo-panel-error.log'),
      out_file: path.join(AUTO_DIR, 'logs/ceo-panel-out.log'),
      merge_logs: true,
      log_type: 'json',
    },

    // ===== 5. Cloudflare Quick Tunnel (Remote Access) =====
    {
      name: 'ceo-tunnel',
      script: '/opt/homebrew/bin/cloudflared',
      args: 'tunnel --url http://localhost:9001',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      restart_delay: 10000,       // chờ 10s trước khi retry tunnel
      watch: false,
      interpreter: 'none',        // cloudflared là binary, không cần interpreter
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: path.join(AUTO_DIR, 'logs/ceo-tunnel-error.log'),
      out_file: path.join(AUTO_DIR, 'logs/ceo-tunnel-out.log'),
      merge_logs: true,
    },
  ],
};
