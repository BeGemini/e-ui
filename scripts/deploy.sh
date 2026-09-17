#!/bin/bash
set -e

# ============================================================
# 日常发布脚本
# 用途：拉取最新代码、安装依赖、执行数据库迁移、重新构建并重启服务
# 用法：
#   cd /opt/e-ui
#   ./scripts/deploy.sh
# ============================================================

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$APP_DIR/logs"

cd "$APP_DIR"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "开始部署：$(date '+%Y-%m-%d %H:%M:%S')"

# ---------------- 1. 拉取最新代码 ----------------
log_info "拉取最新代码..."
git pull origin "$(git rev-parse --abbrev-ref HEAD)"

# ---------------- 2. 安装依赖 ----------------
log_info "安装生产依赖（npm ci）..."
npm ci

# ---------------- 3. 数据库迁移 ----------------
log_info "执行数据库迁移..."
npm run db:migrate

# ---------------- 4. 构建应用 ----------------
log_info "构建 Next.js 应用..."
npm run build

# ---------------- 5. 重启服务 ----------------
log_info "重启应用..."
if command -v pm2 >/dev/null 2>&1 && [ -f "$APP_DIR/ecosystem.config.js" ]; then
  pm2 restart ecosystem.config.js
  log_info "应用已通过 PM2 重启"
else
  log_warn "未安装 PM2 或缺少 ecosystem.config.js，使用 nohup 重启"
  if [ -f "$APP_DIR/.pid" ]; then
    OLD_PID=$(cat "$APP_DIR/.pid")
    if kill -0 "$OLD_PID" >/dev/null 2>&1; then
      kill "$OLD_PID"
      log_info "已终止旧进程 $OLD_PID"
    fi
  fi
  nohup ./node_modules/.bin/next start > "$LOG_DIR/next-start.log" 2>&1 &
  echo $! > "$APP_DIR/.pid"
  log_info "应用已使用 nohup 重启"
fi

# ---------------- 6. 健康检查 ----------------
log_info "等待应用启动（5 秒）..."
sleep 5

PORT=$(grep -oE '^PORT=[0-9]+' "$APP_DIR/.env.local" | cut -d'=' -f2)
PORT=${PORT:-3000}

if curl -sf "http://127.0.0.1:$PORT" >/dev/null; then
  log_info "✅ 部署成功，应用监听端口 $PORT"
else
  log_error "❌ 健康检查失败，请查看日志定位问题"
  if command -v pm2 >/dev/null 2>&1; then
    pm2 logs e-ui --lines 50
  else
    tail -n 50 "$LOG_DIR/next-start.log"
  fi
  exit 1
fi

log_info "部署完成：$(date '+%Y-%m-%d %H:%M:%S')"
