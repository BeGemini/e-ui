---
description: "Task list for TED Talks video and subtitle acquisition"
---

# Tasks: TED Talks 视频与字幕采集

**Input**: Design documents from `specs/009-fetch-ted-talks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/fetch-ted-talks.md, quickstart.md

**Tests**: 规格未明确要求 TDD，因此不设置独立测试编写任务；自动化回归、类型检查和真实链路验收纳入最终阶段。

**Organization**: 任务按用户故事组织。US1 是可独立交付的 TED 采集 MVP；US2 保护现有 Manual 创建路径。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 不同文件且无未完成任务依赖，可并行执行
- **[Story]**: US1 对应 TED 链接采集，US2 对应 Manual 路径保留
- 所有任务均包含明确文件路径

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 准备本功能需要的 shadcn 控件和系统部署前置条件

- [X] T001 [P] 使用项目现有 shadcn 配置新增可键盘操作的 Tabs 组件，不引入其他 UI 库：`components/ui/tabs.tsx`
- [X] T002 [P] 记录本地与生产的 `ffmpeg` 安装检查、`ffmpeg -version` 验证和采集路由至少 300 秒代理超时要求：`DEPLOYMENT.md`、`specs/009-fetch-ted-talks/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立两个用户故事共享的类型、校验、上传、请求取消和双 tab 骨架

**⚠️ CRITICAL**: 本阶段完成前不得开始用户故事任务

- [X] T003 [P] 定义 TED 请求/响应、`TedFetchErrorCode`、来源与媒体资源类型，以及客户端状态字面量 `"idle" | "fetching" | "success" | "error"`；成功响应包含两个 COS key 和 `probe.ok === true`，外部 JSON 不使用无依据的 `any`：`lib/types.ts`
- [X] T004 [P] 新增 TED URL 请求 schema：`url` trim 后为 1–2000 字符，只允许 HTTPS、hostname 精确为 `www.ted.com`、path 仅匹配 `/talks/<slug>` 且不含额外路径段：`lib/validation.ts`
- [X] T005 [P] 扩展 COS wrapper 以支持 Node `Stream` 和 ContentType 的流式上传，复用现有初始化、bucket/region 配置并避免将整部视频读入内存：`lib/cos-client.ts`
- [X] T006 [P] 扩展管理端请求 helper 以接受可选 `AbortSignal`，保持现有鉴权头、JSON 编码和返回结构兼容：`app/components/admin/admin-client.ts`
- [X] T007 将现有练习弹窗重构为 shadcn `Manual` / `Fetch TED Talks` 双 tab 骨架，默认 `Manual`，共有 Episode/Title/Difficulty、Footer 和现有 Manual 字段保持可用：`app/components/admin/ExerciseFormDialog.tsx`

**Checkpoint**: 双 tab 骨架可打开，Manual 默认路径未改变，共享类型与基础设施就绪

---

## Phase 3: User Story 1 - 通过 TED Talks 链接准备练习素材 (Priority: P1) 🎯 MVP

**Goal**: 管理员提交一个公开 TED Talk 链接后获得已上传 COS 且通过资源探测的 MP4 与英文 VTT，并确认创建练习

**Independent Test**: 输入 `https://www.ted.com/talks/surya_ganguli_can_ai_match_the_human_brain`，确认 300 秒内返回同目录的 MP4/VTT COS key、视频可播放、字幕时间轴一致，且只有管理员 Save 后才创建练习

### Implementation for User Story 1

- [X] T008 [P] [US1] 实现 TED 页面获取与 `__NEXT_DATA__` 解析，验证 HTTP/Content-Type、映射 404 与上游错误，并用类型守卫读取非空 `videoData.id`、slug、title 和同一 `videoPlayerData.resources.hls`：`lib/ted-talk.ts`
- [X] T009 [US1] 在同一解析模块中读取 HLS metadata，选择 `subtitles[]` 中 `code === "en"` 的完整 `webvtt`，验证非空 WEBVTT 与时间轴；HLS、metadata、VTT 必须为 HTTPS 允许的 TED 媒体地址并保留原查询参数（包括 `intro_master_id`），缺失时分别报 `VIDEO_UNAVAILABLE` 或 `ENGLISH_SUBTITLES_UNAVAILABLE`：`lib/ted-talk.ts`（依赖 T008）
- [X] T010 [P] [US1] 实现 `ffmpeg` 可用性检测和 HLS 到 MP4 的无损转封装，选择高质量音视频、启用 faststart、使用安全临时目录、响应 AbortSignal/300 秒截止并终止子进程和清理临时文件：`lib/ted-media.ts`
- [X] T011 [US1] 编排 MP4/VTT 上传与清理：对象键采用 `TED/<tedId>-<safeSlug>/<uuid>.mp4`，字幕使用同目录同 UUID 的 `.vtt`，ContentType 分别为 `video/mp4` 和 `text/vtt; charset=utf-8`；上传后调用 `probeExercise`，仅在两个资源均成功时返回，失败尽力删除本次不完整对象：`lib/ted-media.ts`（依赖 T005、T008、T009、T010）
- [X] T012 [US1] 新建管理员 `POST` 采集端点，复用 `requireAdmin`/`parseBody`，声明 Node runtime、`maxDuration = 300` 和真实内部截止；按契约返回两个 COS key 与 probe，并映射 400/401/403/404/422/500/502/504 错误且不泄露堆栈、凭证或临时路径：`app/api/admin/exercises/fetch-ted/route.ts`（依赖 T003、T004、T011）
- [X] T013 [US1] 在 Fetch tab 添加单链接 Label/Input、采集 Button 和四种状态展示；提交前执行 URL schema 校验，`fetching` 禁止重复操作，失败保留 `sourceUrl` 并显示可重试错误：`app/components/admin/ExerciseFormDialog.tsx`（依赖 T007、T012）
- [X] T014 [US1] 接通采集请求与草稿：成功原子写入当前 `videoUrl`、`subtitleUrl` 和响应 probe，不自动 Save；切换/重试使旧任务失效，关闭弹窗 abort，卸载后忽略结果，手动修改资源仍清空旧 probe：`app/components/admin/ExerciseFormDialog.tsx`、`app/components/admin/admin-client.ts`（依赖 T006、T013）

**Checkpoint**: US1 可独立演示，从 TED 链接到可保存练习无需外部下载或上传工具，失败不会产生练习或成功的半成品状态

---

## Phase 4: User Story 2 - 保留手动录入方式 (Priority: P2)

**Goal**: Manual 的字段、资源探测、警告确认和 Save 行为与改动前一致，并可作为采集失败后的备选路径

**Independent Test**: 默认 Manual 下使用已知有效 COS MP4 与 SRT/VTT 完成 Validate resources 和 Save；再从失败或未完成的 TED 采集切回 Manual，确认可编辑、可探测、可保存且路径不被覆盖

### Implementation for User Story 2

- [X] T015 [US2] 隔离 Manual 与 TED 的编辑和异步状态：保留 Manual 默认选中、原有 `AdminExerciseProbeSchema`/`AdminExerciseCreateSchema` 校验、资源变更失效、警告确认和 Save 条件；切换 tab 保留手动输入，失败或迟到的 TED 结果不得覆盖手动资源：`app/components/admin/ExerciseFormDialog.tsx`（依赖 T014）

**Checkpoint**: Manual 既有验收场景全部通过，US1 与 US2 在同一弹窗中均可用且互不污染草稿

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 验证两个故事的代码质量、权限、真实媒体链路和桌面可访问性

- [X] T016 [P] 运行现有单元/集成回归以及 `type-check`、`lint`、`build`，将新采集端点纳入现有管理权限验证并修复本功能引入的问题：`package.json`、`tests/integration/admin-content.test.ts`
- [X] T017 按指南完成真实 TED/COS 链路、错误与取消、Manual 回归和 1280px 桌面键盘/ARIA 验收，确认片头与 VTT 时间轴一致并记录任何环境阻塞：`specs/009-fetch-ted-talks/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，T001 与 T002 可并行
- **Foundational (Phase 2)**: 依赖 Setup；T003–T006 可并行，T007 依赖 T001
- **User Story 1 (Phase 3)**: 依赖 Foundational；完成后即为 MVP
- **User Story 2 (Phase 4)**: Manual 基础路径在 Foundational 后可独立验证；完整的 TED 失败/迟到结果隔离依赖 US1 的 T014
- **Polish (Phase 5)**: 依赖计划交付的全部用户故事

### User Story Dependencies

```text
Setup → Foundational → US1 (P1, MVP) → US2 完整隔离验证 → Polish
                         └────────────→ Manual 基础回归可提前进行
```

- US1 不依赖 US2。
- US2 的 Manual 基本能力源自现有功能并可独立测试；与 TED 异步结果的组合场景需在 US1 UI 接通后验证。
- 推荐按 P1 → P2 顺序执行，避免同时修改 `ExerciseFormDialog.tsx`。

### Within Each User Story

- US1：页面解析与 ffmpeg 处理可先并行；完整解析后再编排上传；上传编排完成后接 API；API 完成后接 UI；最后处理草稿生命周期。
- US2：在 US1 状态接通后收敛共享弹窗行为，不改变既有 API 合约。

### Parallel Opportunities

- T001、T002：不同文件，可并行。
- T003、T004、T005、T006：不同文件，可并行。
- T008、T010：TED 页面解析与媒体进程处理为不同文件，可在 Foundational 后并行。
- US2 的 Manual 基础回归可与 US1 后端任务并行，但 T015 必须等待 T014。

---

## Parallel Example: User Story 1

```text
Task: "T008 实现 TED 页面获取与 __NEXT_DATA__ 解析 in lib/ted-talk.ts"
Task: "T010 实现 ffmpeg 转封装与临时文件生命周期 in lib/ted-media.ts"
```

两项仅共享 Phase 2 已定义的类型，可在 T009/T011 之前由不同执行者完成。

## Parallel Example: User Story 2

```text
Task: "US2 Manual 基础回归：使用已知 COS 资源完成现有 probe/save 流程"
Task: "US1 T008/T010：并行实现 TED 解析与媒体处理"
```

US2 只有一个实现任务且与 US1 UI 共用文件，因此 T015 不标 [P]；可在等待 US1 期间先完成 Manual 基础回归。

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Setup 与 Foundational。
2. 完成 US1 的解析、转封装、上传、API 和 UI。
3. 用样例 TED 链接独立验证 MP4/VTT、probe、Save 和失败行为。
4. 此时即可演示或交付 TED 采集 MVP。

### Incremental Delivery

1. 共享骨架先保持 Manual 可用，降低重构风险。
2. US1 接通真实采集链路，作为第一个价值增量。
3. US2 完成 Manual 与异步采集的组合回归。
4. 最终执行权限、质量、桌面可访问性和真实媒体验收。

## Notes

- 不新增数据库迁移、任务队列、独立 worker、批量导入、清晰度选择或其他语言字幕回退。
- `ffmpeg` 是真实验收的前置条件；缺失时必须明确报环境错误，不能用未验证的成功响应代替。
- 真实验证会在 COS 创建对象，应使用测试数据并确认内容使用权。
