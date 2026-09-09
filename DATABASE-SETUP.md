# MySQL 数据库配置指南

## 问题

`npm run db:migrate` 失败：**Access denied for user 'root'@'localhost'**

这通常意味着：
1. MySQL 还没有安装
2. MySQL 用户名或密码不正确
3. MySQL 服务没有运行

---

## 解决方案

### 方案 A：MySQL 没有设置密码（最常见）

编辑 `.env.local`，修改第 4 行：

```bash
# 当前设置：
DATABASE_URL=mysql://root:password@localhost:3306/english_listening_db

# 改为（如果 root 没有密码）：
DATABASE_URL=mysql://root@localhost:3306/english_listening_db
```

然后运行：
```bash
npm run db:check   # 验证连接
npm run db:migrate # 运行迁移
npm run db:seed    # 加载示例数据
```

---

### 方案 B：MySQL 还没有安装

使用 Homebrew 安装 MySQL（macOS）：

```bash
# 安装 MySQL
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# MySQL 默认创建的 root 用户没有密码
# 所以使用方案 A 的配置
```

---

### 方案 C：使用 Docker 运行 MySQL

如果不想在本地安装 MySQL，可以使用 Docker：

```bash
# 安装 Docker Desktop（如果还没安装）
# https://www.docker.com/products/docker-desktop

# 运行 MySQL 容器
docker run -d \
  --name mysql-english-listening \
  -e MYSQL_ROOT_PASSWORD=password \
  -p 3306:3306 \
  mysql:8.0

# 此时 .env.local 中的配置就是正确的：
# DATABASE_URL=mysql://root:password@localhost:3306/english_listening_db

# 查看容器状态
docker ps

# 停止/启动容器
docker stop mysql-english-listening
docker start mysql-english-listening
```

---

### 方案 D：使用现有的 MySQL 用户

如果你已经有 MySQL 用户和密码：

```bash
# 修改 .env.local：
DATABASE_URL=mysql://your_username:your_password@localhost:3306/english_listening_db
```

---

## 验证配置

完成上述任一方案后，运行：

```bash
# 1. 检查数据库连接
npm run db:check

# 2. 创建数据库架构
npm run db:migrate

# 3. 加载示例数据
npm run db:seed

# 4. 启动开发服务器
npm run dev
```

---

## 快速排查

如果仍然出现问题，运行以下命令进行诊断：

```bash
# 检查 MySQL 是否运行
ps aux | grep mysql

# 检查端口 3306 是否开放
lsof -i :3306

# 查看 .env.local 文件
cat .env.local | grep DATABASE_URL

# 尝试直接连接 MySQL（使用 mysql-cli 如果安装了）
mysql -u root -p  # 按提示输入密码（如果有的话）
```

---

## 下一步

完成 MySQL 配置后：

```bash
# 1. 运行迁移
npm run db:migrate

# 输出示例：
# 🔄 Connecting to MySQL at localhost:3306...
# ✅ Connected to MySQL server
# 📦 Creating database "english_listening_db"...
# ✅ Database "english_listening_db" ready
# 📄 Read migration file...
# 🔄 Found 9 SQL statements to execute
# ✅ Executed 9 statements successfully
# ✅ Database now contains 9 tables:
#    • Series, Season, Episode, Exercise...

# 2. 加载示例数据
npm run db:seed

# 3. 启动开发服务器
npm run dev
```

---

## 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `Access denied` | 用户名/密码错误 | 检查 .env.local 中的 DATABASE_URL |
| `Can't connect to MySQL` | MySQL 没有运行 | 启动 MySQL 服务 |
| `ER_BAD_DB_ERROR` | 数据库不存在 | 运行 `npm run db:migrate` 创建 |
| `Command not found: mysql` | MySQL CLI 未安装 | 使用 Node.js 脚本（已配置） |

---

## 帮助

- 检查连接：`npm run db:check`
- 查看示例脚本：`scripts/migrate.ts`、`scripts/seed-data.ts`
- 更多信息：`DEPENDENCY-FIX-REPORT.md`、`PHASE-0-COMPLETION-REPORT.md`
