#!/bin/bash
set -e

# ============================================================
# 首次发布脚本
# 用途：在新服务器上完成环境检查、依赖安装、数据库初始化、构建和启动
# 用法：
#   1. 把代码 clone 到服务器目录，如 /opt/e-ui
#   2. cd /opt/e-ui
#   3. chmod +x scripts/first-deploy.sh
#   4. ./scripts/first-deploy.sh
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

# ---------------- 1. 检查基础环境 ----------------
log_info "检查基础环境..."

command -v node >/dev/null 2>&1 || { log_error "未安装 Node.js，请先安装 Node.js 18+"; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "未安装 npm"; exit 1; }
command -v git >/dev/null 2>&1 || { log_error "未安装 git"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  log_error "Node.js 版本过低，需要 18+，当前 $(node -v)"
  exit 1
fi
log_info "Node.js 版本：$(node -v)"

# ---------------- 2. 检查 .env.local ----------------
if [ ! -f "$APP_DIR/.env.local" ]; then
  log_warn "未找到 .env.local 文件"
  if [ -f "$APP_DIR/.env.production.example" ]; then
    log_info "已复制 .env.production.example 为 .env.local，请立即修改其中的敏感配置"
    cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.local"
  fi
  log_error "请先编辑 $APP_DIR/.env.local 里的数据库密码、JWT_SECRET、COS、DeepSeek 等配置后再运行"
  exit 1
fi

log_info "检查 .env.local 中的关键配置..."
if ! grep -qE '^DATABASE_URL=mysql://' "$APP_DIR/.env.local"; then
  log_error ".env.local 中 DATABASE_URL 配置不正确"
  exit 1
fi

# ---------------- 3. 安装依赖 ----------------
log_info "安装生产依赖（npm ci）..."
npm ci

# ---------------- 4. 检查并创建日志目录 ----------------
mkdir -p "$LOG_DIR"

# ---------------- 5. 数据库检查与迁移 ----------------
log_info "检查数据库连接..."
npm run db:check

log_info "执行数据库迁移..."
npm run db:migrate

# ---------------- 6. 是否加载示例数据 ----------------
read -p "是否加载示例数据？(y/N): " seed_choice
if [[ "$seed_choice" =~ ^[Yy]$ ]]; then
  log_info "加载示例数据..."
  npm run db:seed
else
  log_warn "跳过示例数据加载"
fi

# ---------------- 7. 构建应用 ----------------
log_info "构建 Next.js 应用..."
npm run build

# ---------------- 8. 使用 PM2 启动 ----------------
log_info "准备启动应用..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 start ecosystem.config.js
  pm2 save
  log_info "应用已通过 PM2 启动"
  log_info "常用命令："
  log_info "  pm2 logs e-ui      # 查看日志"
  log_info "  pm2 restart e-ui   # 重启"
  log_info "  pm2 stop e-ui      # 停止"
else
  log_warn "未安装 PM2，将使用 nohup 启动（建议生产环境安装 PM2）"
  nohup ./node_modules/.bin/next start > "$LOG_DIR/next-start.log" 2>&1 &
  echo $! > "$APP_DIR/.pid"
  log_info "应用已在后台启动，PID 保存在 .pid"
fi

# ---------------- 9. 健康检查 ----------------
log_info "等待应用启动（5 秒）..."
sleep 5

PORT=$(grep -oE '^PORT=[0-9]+' "$APP_DIR/.env.local" | cut -d'=' -f2)
PORT=${PORT:-3000}

if curl -sf "http://127.0.0.1:$PORT" >/dev/null; then
  log_info "✅ 应用启动成功，监听端口 $PORT"
else
  log_error "❌ 应用可能未正常启动，请检查日志"
  exit 1
fi

log_info "首次部署完成！"
