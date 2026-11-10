# Implementation Plan: TED Talks 视频与字幕采集

**Branch**: `009-fetch-ted-talks` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-fetch-ted-talks/spec.md`

## Summary

在现有 `ExerciseFormDialog` 中增加 shadcn “Manual / Fetch TED Talks”双 tab，默认保留手动创建路径。管理员提交单个 TED Talk 链接后，由 Next.js 管理接口读取页面 `__NEXT_DATA__`，从同一播放器资源取得 HLS 视频与完整英文 WebVTT；使用服务器上的 `ffmpeg` 无损转封装为带 faststart 的 MP4，将 MP4 和 VTT 上传至现有 COS，复用 `probeExercise` 校验后把对象路径返回当前草稿。采用单次长请求和四种明确的客户端状态，不新增数据库表、独立任务服务或自动创建练习行为。

## Technical Context

**Language/Version**: TypeScript 5（strict）、Node.js 20+、Next.js 16.3.4、React 19.2.8

**Primary Dependencies**: 现有 Next.js Route Handler、shadcn/ui、Zod、`cos-nodejs-sdk-v5` 2.12.5；系统可执行文件 `ffmpeg`；Node.js 内置 `child_process`、文件与流 API

**Storage**: 现有腾讯云 COS（新增 MP4/VTT 对象）；服务器临时目录（任务结束清理）；现有 MySQL 仅沿用练习创建，无迁移

**Testing**: Jest 29、Testing Library、Playwright；现有 `npm run type-check`、`npm run lint`、`npm run build`

**Target Platform**: 桌面管理浏览器（1280px 及以上）；PM2 托管的 Next.js Node.js 服务器

**Project Type**: Next.js 全栈 Web 应用

**Performance Goals**: 正常网络下 90% 单个演讲在 5 分钟内完成采集、上传与资源探测；避免将整个视频读入 Node.js 内存

**Constraints**: 单次请求内部总截止时间 300 秒；仅允许白名单 TED 来源；单弹窗一个任务；上传采用流；关闭弹窗中止客户端等待且不得污染后续草稿；无独立后端服务；无移动端专属工作

**Scale/Scope**: 每次一个公开 TED Talk；两个录入 tab；一条采集管理接口；不支持批量、定时同步、清晰度选择或非英文字幕回退

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. shadcn-First — PASS**: 新增 Tabs、Input、Button、Alert 等均使用 shadcn；缺少的 Tabs 通过项目 shadcn 配置加入，不创建自定义基础控件。
- **II. Type Safety — PASS**: TED 页面数据、播放器资源、请求/响应、采集状态和错误均定义窄类型；对外部 JSON 先运行时校验，不使用无依据的 `any`。
- **III. Next.js Only — PASS**: 采集、转封装、上传均在 `app/api/admin/exercises/fetch-ted/route.ts` 及其 `lib/` 助手内完成；`ffmpeg` 是同一服务器的本地可执行文件，不是外部服务。
- **IV. Desktop & Accessibility — PASS**: 仅验证 1280px 及以上；Tabs 支持键盘，输入有 Label，状态使用可访问的 live region，颜色对比沿用 shadcn 主题。
- **V. Quality & Testing — PASS**: 核心解析、URL 校验、错误映射与 UI 状态有自动化测试；完成类型检查、lint、build 和真实链路验证。
- **VI. Avoid Over-Engineering — PASS**: 单请求、无任务队列表、无新增微服务、无批量或额外编辑器；只扩展创建练习所需路径。

**Pre-design gate**: 通过，无需要豁免的违规。

## Project Structure

### Documentation (this feature)

```text
specs/009-fetch-ted-talks/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── fetch-ted-talks.md
├── checklists/
│   └── requirements.md
└── tasks.md             # 由 /skill:speckit-tasks 生成
```

### Source Code (repository root)

```text
app/
├── api/admin/exercises/
│   ├── fetch-ted/route.ts       # 管理权限、请求截止、编排与错误响应
│   ├── probe/route.ts           # 复用现有资源探测
│   └── route.ts                 # 复用现有练习创建
└── components/admin/
    ├── ExerciseFormDialog.tsx   # 双 tab、采集状态和草稿隔离
    └── admin-client.ts          # 必要时为采集请求补充 AbortSignal 支持

components/ui/
└── tabs.tsx                     # shadcn Tabs

lib/
├── ted-talk.ts                  # URL 白名单、页面/元数据解析、VTT 获取
├── ted-media.ts                 # ffmpeg 转封装、临时文件与 COS 编排
├── cos-client.ts                # 增加流式上传能力
├── media-probe.ts               # 复用最终 COS 资源校验
├── types.ts                     # TED 请求、响应、状态和错误类型
└── validation.ts                # TED URL 请求 schema

tests/
├── unit/
│   ├── ted-talk.test.ts
│   ├── ted-media.test.ts
│   └── exercise-form-dialog.test.tsx
├── integration/
│   └── admin-content.test.ts    # 将新端点纳入 401/403 检查
└── e2e/                         # 真实 TED/COS 链路按 quickstart 验证
```

**Structure Decision**: 沿用单一 Next.js 全栈结构。页面解析与媒体处理分为两个小模块以便隔离外部数据和进程测试；接口与 UI 均放在现有 admin 路径，不建立新应用或服务。

## Design Notes

- **请求生命周期**: `POST` 保持打开直至成功或失败；Route Handler 使用 Node runtime 并声明 `maxDuration = 300`，同时用内部 AbortController 执行真实截止。PM2 自身无路由超时，部署代理也必须允许该时长。
- **草稿隔离**: 弹窗持有本次采集的 AbortController 和状态；链接变化、重复点击、tab 切换和关闭均遵守同一状态机。关闭时 abort，卸载后忽略结果；成功仅写入当前 `videoUrl`/`subtitleUrl` 及响应中的 probe，不自动保存练习。
- **完整性与时间轴**: HLS 与 VTT 均保留 TED 返回的原始查询参数（包括可能的 `intro_master_id`），不自行加减片头偏移。两个对象上传并探测成功后才返回成功。
- **资源键**: 使用 TED 数字 ID、净化后的 slug 和随机 UUID 生成 `TED/` 下的唯一 `.mp4`/`.vtt` 对象键；失败时清理临时文件，并尽力删除本次已上传的不完整对象。
- **部署前置条件**: 本地与生产服务器必须安装 `ffmpeg` 且运行用户可执行；启动采集前检测，缺失时返回可操作错误，不在请求中动态安装。

## Post-Design Constitution Check

- 所有六项仍为 **PASS**。设计未引入新 UI 体系、独立服务、数据库迁移、非 TypeScript 应用代码或移动端范围。
- 流式上传和临时文件满足媒体体积约束；300 秒硬截止与清理逻辑避免长任务失控。
- 无 Complexity Tracking 项。
