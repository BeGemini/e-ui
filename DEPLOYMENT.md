# 直接部署指南（Linux 服务器）

本指南用于在 Linux 服务器上直接部署 Next.js 应用，不依赖 Docker。

## 准备工作

### 1. 服务器环境要求

- Ubuntu / Debian / CentOS 等 Linux 发行版
- Node.js 18+ 和 npm
- MySQL 8.0+
- Git
- （推荐）PM2 进程管理器

### 2. 安装基础软件（以 Ubuntu 为例）

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20（LTS）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node -v  # v20.x.x
npm -v   # 10.x.x

# 安装 MySQL
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全设置（按提示设置 root 密码）
sudo mysql_secure_installation

# 安装 PM2（强烈推荐）
sudo npm install -g pm2
```

### 3. 创建数据库和用户

```bash
sudo mysql -u root -p
```

在 MySQL 中执行：

```sql
CREATE DATABASE IF NOT EXISTS english_listening_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'eui_user'@'localhost' IDENTIFIED BY '你的强密码';
GRANT ALL PRIVILEGES ON english_listening_db.* TO 'eui_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 部署步骤

### 首次部署

```bash
# 1. 克隆代码
cd /opt
git clone <你的仓库地址> e-ui
cd e-ui

# 2. 创建环境配置文件
cp .env.production.example .env.local
nano .env.local
# 修改 DATABASE_URL、JWT_SECRET、COS 密钥、DEEPSEEK_API_KEY 等

# 3. 赋予脚本执行权限并运行首次部署
chmod +x scripts/first-deploy.sh
./scripts/first-deploy.sh
```

首次部署脚本会依次完成：
1. 检查 Node.js、npm、git 环境
2. 检查 `.env.local`
3. `npm ci` 安装依赖
4. `npm run db:check` 检查数据库连接
5. `npm run db:migrate` 执行数据库迁移（首次会创建所有表）
6. 询问是否加载示例数据（可选）
7. `npm run build` 构建 Next.js
8. 使用 PM2 启动应用
9. 健康检查

### 日常更新

之后每次在服务器上拉取最新代码，只需执行：

```bash
cd /opt/e-ui
./scripts/deploy.sh
```

该脚本会完成：
1. `git pull`
2. `npm ci`
3. `npm run db:migrate`（自动跳过已执行过的迁移）
4. `npm run build`
5. 重启应用
6. 健康检查

## 数据库迁移说明

迁移脚本位于 `migrations/` 目录：

- `001_initial_schema.sql` — 创建 Series、Season、Episode、Exercise、User 等核心表
- `002_add_effective_sentence_count.sql` — 添加 effectiveSentenceCount 字段
- `003_add_knowledge_points.sql` — 添加知识点相关表

`npm run db:migrate` 会：
1. 自动创建数据库（如果不存在）
2. 创建 `__migrations` 表记录已执行的迁移
3. 按文件名顺序执行尚未应用的迁移
4. 已应用的迁移会自动跳过，不会重复执行

所以日常发布时直接运行 `./scripts/deploy.sh` 即可，无需手动处理数据库。

## 环境变量说明

| 变量 | 说明 | 是否必填 |
|------|------|---------|
| `DATABASE_URL` | MySQL 连接串 | 是 |
| `JWT_SECRET` | JWT 签名密钥，生产环境必须随机生成 | 是 |
| `JWT_EXPIRY` | JWT 过期时间 | 是 |
| `COS_REGION` | 腾讯云 COS 地域 | 是 |
| `COS_BUCKET` | 腾讯云 COS Bucket | 是 |
| `COS_SECRET_ID` | 腾讯云 COS SecretId | 是 |
| `COS_SECRET_KEY` | 腾讯云 COS SecretKey | 是 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 是 |
| `API_BASE_URL` | 外部可访问的域名或 IP | 是 |
| `NODE_ENV` | 固定为 `production` | 是 |
| `LOG_LEVEL` | 日志级别，`info` 或 `debug` | 否 |

## 配置 Nginx 反向代理（推荐）

如果应用跑在 `127.0.0.1:3000`，用 Nginx 暴露到 80/443：

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/e-ui
```

写入：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/e-ui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

后续可配合 Certbot 申请 HTTPS 证书。

## 常用维护命令

```bash
# 查看 PM2 进程
pm2 status

# 查看应用日志
pm2 logs e-ui

# 重启应用
pm2 restart e-ui

# 查看资源占用
pm2 monit

# 手动执行数据库迁移
npm run db:migrate

# 手动检查数据库连接
npm run db:check
```

## 注意事项

1. **`.env.local` 不要提交到 Git**，服务器上单独维护。
2. 生产环境的 `JWT_SECRET` 务必使用随机强密码，不要用开发环境的值。
3. 建议开启服务器防火墙，仅开放 22、80、443 端口。
4. 定期备份 MySQL 数据库。
5. 如果服务器内存小于 2GB，Next.js 构建可能会比较慢或 OOM，建议增加 swap 空间。
