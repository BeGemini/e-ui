---
description: "Task list for 后台内容管理"
---

# Tasks: 后台内容管理（Series / Season / Episode / Exercise）

**Input**: Design documents from `/specs/005-admin-content-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-api.md, quickstart.md

**Tests**: spec 没有要求 TDD。只保留 plan.md 中列出的两项测试：资源探测逻辑的单元测试，以及 admin 接口的集成测试。它们覆盖的是最容易出错的部分。

**Organization**: 按用户故事分组。US1 和 US4 都是 P1，US1 是核心价值，排在前面；US4 的服务端鉴权部分放进了 Foundational。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（文件不同，且不依赖未完成的任务）
- **[Story]**: 所属用户故事（US1–US4）

---

## Phase 1: Setup

**Purpose**: 补齐 UI 组件

- [X] T001 运行 `npx shadcn@latest add select label alert`，生成 components/ui/select.tsx、components/ui/label.tsx、components/ui/alert.tsx，并确认 `npm run type-check` 通过

---

## Phase 2: Foundational（阻塞所有用户故事）

**Purpose**: 管理员鉴权、共享类型、内容树接口、`/admin` 页面骨架

**⚠️ CRITICAL**: 本阶段完成前，不要开始任何用户故事

- [X] T002 [P] 在 lib/session.ts 新增 `requireAdmin(request)`：复用 `requireAuth`，未登录返回 401，非管理员返回 403 `{ error: 'Forbidden: admin only' }`，通过时返回 session
- [X] T003 [P] 在 proxy.ts 的 `protectedRoutes` 和 `config.matcher` 中加入 `/api/admin`（以及 `'/api/admin/:path*'`）
- [X] T004 [P] 在 lib/types.ts 新增类型：`ProbeErrorCode`、`ProbeIssue`、`VideoProbe`、`SubtitleProbe`、`ExerciseProbeResult`、`AdminContentTree`，以及各个 Admin 请求/响应类型（参见 data-model.md 和 contracts/admin-api.md）
- [X] T005 [P] 在 lib/validation.ts 新增 zod schema：`AdminSeriesCreateSchema`、`AdminSeasonCreateSchema`、`AdminEpisodeCreateSchema`、`AdminExerciseProbeSchema`、`AdminExerciseCreateSchema`，字段规则以 data-model.md 为准
- [X] T006 新建 app/api/admin/_shared.ts：统一封装 400（zod fieldErrors）、404（上级不存在）、409（把 `ER_DUP_ENTRY` 映射到对应字段）这几种错误响应
- [X] T007 新建 app/api/admin/content/route.ts：`GET` 接口，先 `requireAdmin`，再返回 Series→Season→Episode→Exercise 内容树（结构见 contracts/admin-api.md），排序按 title / seasonNumber / episodeNumber
- [X] T008 新建 app/admin/page.tsx（客户端组件）：从 localStorage 取 token 调 `/api/auth/me`，没有 token 跳转 `/`，role ≠ admin 跳转 `/dashboard`；然后加载 `/api/admin/content`，用 Card 显示标题和加载、错误状态，为后续组件预留挂载位置

**Checkpoint**: 管理员能打开 `/admin` 并看到数据加载成功；普通用户会被跳转走

---

## Phase 3: User Story 1 - 创建 Exercise 并自动校验资源、提取元数据 (Priority: P1) 🎯 MVP

**Goal**: 在已有的 Episode 下创建 Exercise。服务端校验视频和字幕，自动提取 subtitleFormat、totalSentences、durationSeconds

**Independent Test**: 在已有 Episode 下填入有效的视频和字幕 key，校验后保存。进入练习页，句子数和时长与校验结果一致（quickstart 场景 5–11）

### 探测逻辑

- [X] T009 [US1] 新建 lib/media-probe.ts，实现 `normalizeCosKey(input)`：接受 key 或本 bucket 的完整 COS 链接（`https://{bucket}.cos.{region}.myqcloud.com/...`），去掉 host 后 `decodeURIComponent`，去掉开头的 `/`；其他 host 返回 `FOREIGN_HOST`，空值或非法输入返回 `INVALID_KEY`（R1）
- [X] T010 [US1] 在 lib/media-probe.ts 实现 `probeSubtitle(key)`：先校验扩展名（`detectSubtitleFormat`），再 `downloadFile`（10 秒超时），按 UTF-8 解码（出现 `U+FFFD` 报 `NOT_UTF8`），`parseSubtitles` 出错报 `PARSE_FAILED`，句子数为 0 报 `EMPTY_SUBTITLE`；返回 format、totalSentences、lastCueEndSeconds（R2）
- [X] T011 [US1] 在 lib/media-probe.ts 实现 `probeVideo(key)`：
  - 先校验扩展名是 `.mp4/.m4v/.mov`，然后调用 `initializeCosClient()`（`getSignedUrl` 不会自动初始化）。
  - 在函数开头创建**一个** `AbortSignal.timeout(10_000)`，后续所有请求共用它，超时报 `TIMEOUT`。
  - 用 `getSignedUrl` + `fetch`（`Range: bytes=0-262143`）读取头部，不调用 headObject：404 报 `NOT_FOUND`，其他非 2xx 报 `FETCH_FAILED`；从 `Content-Range` 解析文件总大小。
  - 遍历顶层 box；moov 在文件尾时，根据 mdat 的 size（偏移须小于总大小）再发一次 Range 请求。
  - 解析 mvhd（version 0 和 1）后 `Math.round(duration/timescale)`；不是 ISO-BMFF 报 `NOT_ISO_BMFF`，读不到时长报 `DURATION_UNREADABLE`（R3、R4）
- [X] T012 [US1] 在 lib/media-probe.ts 实现 `probeExercise(videoInput, subtitleInput)`：两路规范化后用 `Promise.allSettled` 并行探测；当 lastCueEndSeconds > durationSeconds + 1 时加入 `SUBTITLE_EXCEEDS_VIDEO` warning；返回 `ExerciseProbeResult`
- [X] T013 [P] [US1] 新建 tests/unit/media-probe.test.ts：用合成 Buffer 覆盖 mvhd v0/v1、moov 在头部和尾部、非 MP4 数据；覆盖 normalizeCosKey 的 key、完整链接、外部 host、URL 编码；mock `downloadFile` 覆盖字幕的空内容、非 UTF-8、不支持的扩展名

### 接口

- [X] T014 [US1] 新建 app/api/admin/exercises/probe/route.ts：`POST` 接口，`requireAdmin` 后用 `AdminExerciseProbeSchema` 校验请求体，调用 `probeExercise`，始终返回 200 和 `ExerciseProbeResult`
- [X] T015 [US1] 新建 app/api/admin/exercises/route.ts：`POST` 接口，`requireAdmin` 后校验请求体，确认 episodeId 存在（否则 404），服务端重新 `probeExercise`（未通过返回 422 和 probe 结果），在事务里插入 Exercise（videoUrl/subtitleUrl 存规范化后的 key，元数据只取 probe 结果），并用 `COUNT(*)` 重算 `Episode.totalExercises`；返回 201 `{ exerciseId, probe }`

### UI

- [X] T016 [US1] 新建 app/components/admin/ExerciseFormDialog.tsx：用 Dialog 包含表单，字段有所属 Episode（Select，可由外部预选）、标题、难度（可选）、视频地址、字幕地址；按 data-model.md 的状态机实现：点"校验"调 probe 接口，用 Badge 展示格式、句子数、时长（mm:ss），每个字段下方用 Alert 显示对应错误（通过 `aria-describedby` 关联）；修改任一 URL 后清空结果并禁用保存；有 warning 时需勾选 Checkbox 确认；保存后调用 `onCreated()`
- [X] T017 [US1] 在 app/admin/page.tsx 加入"新建练习"按钮，接入 ExerciseFormDialog：Episode 下拉选项从内容树中扁平化得到（格式为"Series / S1 / E1 标题"），保存成功后重新加载内容树

**Checkpoint**: US1 可以独立演示，已有的 Episode 不再需要脚本就能追加练习

---

## Phase 4: User Story 4 - 访问控制 (Priority: P1)

**Goal**: 只有管理员能看到并使用后台；服务端拒绝所有越权请求

**Independent Test**: 用普通用户访问 `/admin` 和任意 `/api/admin/*` 都被拒绝（quickstart 场景 1–2）

- [X] T018 [US4] 修改 app/dashboard/page.tsx：在已有的 `/api/auth/me` 结果中读取 role，只有 role 为 admin 时在页头显示指向 `/admin` 的"内容管理"入口（使用 shadcn Button 的链接形态）
- [X] T019 [US4] 新建 tests/integration/admin-content.test.ts（沿用 tests/integration 的现有写法）：覆盖无 token 返回 401、普通用户 token 返回 403、`POST /api/admin/exercises` 的 probe 失败时返回 422 且不写库（mock media-probe）

**Checkpoint**: 鉴权在服务端和前端两侧都已生效

---

## Phase 5: User Story 2 - 创建 Series、Season、Episode 层级 (Priority: P2)

**Goal**: 从零搭建内容层级

**Independent Test**: 创建 Series → Season 1 → Episode 1，学习者端可以看到，计数正确；重复的标题或编号返回 409（quickstart 场景 3–4）

- [X] T020 [P] [US2] 新建 app/api/admin/series/route.ts：`POST` 接口，`requireAdmin` 后校验请求体并插入 Series；标题重复返回 409（field: `title`）；成功返回 201 `{ seriesId }`
- [X] T021 [P] [US2] 新建 app/api/admin/seasons/route.ts：`POST` 接口，校验 seriesId 存在（否则 404），插入 Season；季号重复返回 409（field: `seasonNumber`）
- [X] T022 [P] [US2] 新建 app/api/admin/episodes/route.ts：`POST` 接口，校验 seasonId 存在（否则 404），在事务里插入 Episode，并用 `COUNT(*)` 重算 `Season.totalEpisodes` 和 `Series.totalEpisodes`；集号重复返回 409（field: `episodeNumber`）
- [X] T023 [P] [US2] 新建 app/components/admin/SeriesFormDialog.tsx：字段有标题、难度（Select）、简介、类型、封面图 URL；409 和 400 的错误显示在对应字段下方
- [X] T024 [P] [US2] 新建 app/components/admin/SeasonFormDialog.tsx：字段有所属 Series（Select，可预选）、季号、简介
- [X] T025 [P] [US2] 新建 app/components/admin/EpisodeFormDialog.tsx：字段有所属 Season（Select，可预选）、集号、标题、简介
- [X] T026 [US2] 在 app/admin/page.tsx 加入"新建 Series / Season / Episode"按钮并接入三个对话框，保存成功后刷新内容树
- [X] T027 [US2] 在 tests/integration/admin-content.test.ts 补充用例：重复 Series 标题返回 409、seriesId 不存在返回 404、创建 Episode 后 Season 和 Series 的 totalEpisodes 重算正确

**Checkpoint**: 从零到 Exercise 的完整链路都可以在 UI 中完成（SC-002）

---

## Phase 6: User Story 3 - 浏览内容层级并定位创建位置 (Priority: P3)

**Goal**: 用树形结构浏览内容，并在任意层级直接"新建下级"

**Independent Test**: 逐级展开现有数据，在某个 Episode 上点"新建练习"，该 Episode 已被预选（quickstart US3）

- [X] T028 [US3] 新建 app/components/admin/ContentTree.tsx：用 Collapsible 逐级展示 Series（标题、难度 Badge、集数）、Season（季号、集数）、Episode（集号、标题、练习数）、Exercise（标题、格式、句子数、时长）；每一级都有"新建下级"按钮，通过 `onCreateChild(level, parentId)` 回调通知页面；需要支持键盘操作
- [X] T029 [US3] 在 app/admin/page.tsx 用 ContentTree 替换原来的简单列表，把 `onCreateChild` 接到对应的对话框并传入预选的上级 id；顶部只保留"新建 Series"按钮

**Checkpoint**: 所有用户故事都可以独立使用

---

## Phase 7: Polish & Cross-Cutting

- [X] T030 运行 `npm run type-check` 和 `npm run lint`，修复本功能引入的问题
- [ ] T031 （部分完成：已验证 1、2、5、7、8、9、11；3、4、6、10 需要写库并真正保存，请在测试库上手动执行）按 specs/005-admin-content-management/quickstart.md 手动走一遍 11 个场景，记录结果

---

## Dependencies & Execution Order

### Phase 依赖

- Setup（T001）→ Foundational（T002–T008）→ 各用户故事
- US1（Phase 3）只依赖 Foundational
- US4（Phase 4）只依赖 Foundational；T019 中的 422 用例需要 T015
- US2（Phase 5）只依赖 Foundational；T026 与 T017 都修改 app/admin/page.tsx，需要串行
- US3（Phase 6）依赖 US1 和 US2 的对话框（T016、T023–T025）
- Polish 在所有目标故事完成后进行

### 故事内部顺序

- US1：T009 → T010、T011 → T012 → T014、T015 → T016 → T017；T013 可以在 T012 之后和接口任务并行
- US2：T020–T025 可以全部并行 → T026 → T027

### 并行示例

```text
# Foundational
T002 lib/session.ts | T003 proxy.ts | T004 lib/types.ts | T005 lib/validation.ts

# US2
T020 series/route.ts | T021 seasons/route.ts | T022 episodes/route.ts
T023 SeriesFormDialog | T024 SeasonFormDialog | T025 EpisodeFormDialog
```

---

## Implementation Strategy

### MVP（推荐先交付）

1. Phase 1 + Phase 2
2. Phase 3（US1）：已有的 Episode 不再需要脚本就能追加练习，核心诉求即可上线
3. Phase 4（US4）：补上入口和鉴权测试，然后可以部署

### 增量交付

1. MVP（US1 + US4）
2. US2：可以从零创建新剧
3. US3：树形浏览，提升录入效率
4. Polish

---

## Notes

- 共 31 个任务：Setup 1、Foundational 7、US1 9、US4 2、US2 8、US3 2、Polish 2
- 不改数据库 schema，不新增 npm 依赖（shadcn 组件除外）
- 每完成一个 Checkpoint 建议单独提交（`feat(admin): ...`）
