# Implementation Plan: 后台内容管理（Series / Season / Episode / Exercise）

**Branch**: `005-admin-content-management` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-admin-content-management/spec.md`

## Summary

为 `admin` 角色提供 `/admin` 页面，用于浏览内容树，并逐级创建 Series、Season、Episode、Exercise。

创建 Exercise 时，服务端完成以下工作：

- 把输入的资源地址规范化为 COS 对象 key（现有数据就是这样存储的，见 research R1）。
- 字幕：用 COS SDK 下载，然后复用现有的 `detectSubtitleFormat` 和 `parseSubtitles` 得到格式和句子数，口径与练习页完全一致。
- 视频：用签名 URL 加 HTTP Range 请求，只读取 MP4 的 `moov/mvhd` box 来获得时长，不下载整个文件。

保存时服务端会重新探测一次，不信任客户端提交的元数据。数据库 schema 不需要改动。

## Technical Context

**Language/Version**: TypeScript 5（strict），Node.js（Next.js runtime）

**Primary Dependencies**: Next.js 16.3（App Router，使用 `proxy.ts`）、React 19、shadcn/ui（@base-ui/react）、mysql2、cos-nodejs-sdk-v5、zod 4、uuid。**不新增 npm 依赖**；只用 shadcn CLI 补充 `select`、`label`、`alert` 组件。

**Storage**: MySQL 8，复用现有表 Series / Season / Episode / Exercise，不需要迁移。媒体文件存放在腾讯云 COS 私有 bucket。

**Testing**: Jest（单元测试和集成测试）、Playwright（可选的 e2e）

**Target Platform**: 部署在 Linux 服务器上的 Next.js（PM2，见 `ecosystem.config.js`）

**Project Type**: Next.js 全栈 Web 应用

**Performance Goals**: 单次 probe ≤ 15 秒（SC-005）。每个资源设一个 10 秒总截止时间（不按步骤分别计时），视频和字幕并行探测。

**Constraints**: 不下载完整视频；不依赖 ffprobe 等系统二进制；元数据以服务端结果为准。

**Scale/Scope**: 管理员人数在个位数，内容量为数百条级。内容树一次性全量返回即可，不做分页。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 结论 | 说明 |
|---|---|---|
| I. shadcn-First | ✅ | 页面只用 shadcn 组件（Card/Collapsible/Dialog/Input/Select/Label/Alert/Button/Badge），缺的组件用 `npx shadcn add` 引入 |
| II. Type Safety | ✅ | 请求和响应都有 TS 类型，并用 zod 校验；probe 结果类型定义在 `lib/types.ts` |
| III. Full-Stack Next.js Only | ✅ | 所有接口都在 `app/api/admin/*`，不引入外部服务或二进制 |
| IV. Desktop Web & Accessible | ✅ | 仅面向桌面端；表单字段都有 Label，错误信息通过 `aria-describedby` 关联到字段 |
| V. Code Quality & Testing | ✅ | `media-probe` 有单元测试，admin 接口有集成测试；需要通过 lint 和 type-check |
| VI. Avoid Over-Engineering | ✅ | 不做编辑、删除、上传、分页；自写约 80 行 MP4 解析代码，不引入 mp4box 或 ffmpeg；不改 schema |

**Post-Design Re-check**: ✅ 设计完成后重新检查，没有违规项，Complexity Tracking 为空。

## Project Structure

### Documentation (this feature)

```text
specs/005-admin-content-management/
├── plan.md              # 本文件
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── admin-api.md     # Phase 1
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── admin/
│   └── page.tsx                       # 新增：后台页面（客户端组件，做 admin 守卫）
├── components/
│   └── admin/                         # 新增
│       ├── ContentTree.tsx            # Series→Season→Episode→Exercise 树（Collapsible）
│       ├── SeriesFormDialog.tsx
│       ├── SeasonFormDialog.tsx
│       ├── EpisodeFormDialog.tsx
│       └── ExerciseFormDialog.tsx     # 实现"校验→确认→保存"状态机
├── dashboard/
│   └── page.tsx                       # 修改：admin 可见"内容管理"入口
└── api/
    └── admin/                         # 新增
        ├── content/route.ts           # GET 内容树
        ├── series/route.ts            # POST
        ├── seasons/route.ts           # POST
        ├── episodes/route.ts          # POST
        └── exercises/
            ├── route.ts               # POST（内部重新 probe）
            └── probe/route.ts         # POST（只读校验）

lib/
├── media-probe.ts                     # 新增：normalizeCosKey / probeVideo / probeSubtitle / probeExercise
├── session.ts                         # 修改：新增 requireAdmin()
├── validation.ts                      # 修改：新增 Admin*Schema
└── types.ts                           # 修改：新增 probe 结果和 admin 请求/响应类型

components/ui/                         # shadcn add: select.tsx, label.tsx, alert.tsx
proxy.ts                               # 修改：保护 /api/admin/*

tests/
├── unit/media-probe.test.ts           # mvhd v0/v1、moov 在尾部、key 规范化、字幕错误分支
└── integration/admin-content.test.ts  # 鉴权 401/403、唯一性 409、404、计数重算、probe 422
```

**Structure Decision**: 沿用现有的单体 Next.js 结构。后台 UI 放在 `app/admin` 和 `app/components/admin`，接口放在 `app/api/admin/*`，可复用的探测逻辑放在 `lib/media-probe.ts`，与现有的 `lib/subtitle-parser.ts`、`lib/cos-client.ts` 并列。

## Key Design Notes

1. **Key 规范化**（R1）：输入可以是 key，也可以是本 bucket 的完整 COS 链接，统一转成 key。其他域名的链接一律拒绝，以保证播放代理 `/api/video/{key}` 可用。
2. **字幕探测**（R2）：先检查扩展名，再 `downloadFile`、UTF-8 解码（遇到 `U+FFFD` 报错）、`parseSubtitles`，最后检查句子数大于 0，并取最后一句的结束时间。
3. **视频探测**（R3、R4）：先调用 `initializeCosClient()`，再用签名 URL Range 读取头部 256 KB（404 即不存在，文件大小从 `Content-Range` 获取，不单独调用 headObject），然后遍历顶层 box。`moov` 在文件尾时，根据 `mdat` 的 size 跳过去再读一次。最后解析 `mvhd`（version 0 和 1 都支持）。所有请求共用一个 10 秒的 `AbortSignal`。
4. **写入事务**（R6）：插入新记录后，用 `COUNT(*)` 重算上级计数。唯一键冲突（`ER_DUP_ENTRY`）映射为 409。
5. **鉴权**（R5）：`proxy.ts` 只检查请求头是否存在，每个 route 再调用 `requireAdmin`。前端守卫只用于体验。

## Complexity Tracking

无违规，不需要填写。
