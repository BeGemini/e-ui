# Research: 后台内容管理

**Feature**: 005-admin-content-management | **Date**: 2026-10-28

## R1. `videoUrl` / `subtitleUrl` 实际存储的是什么

- **Decision**: 两列存储的是 **COS 对象 key**（如 `Desperate Hosewives/S01/E01.mp4`），不是完整 URL。后台表单接受 key 或同一 bucket 的完整 COS 链接，服务端统一规范化为 key 后再校验、入库。
- **Rationale**:
  - `app/api/practice/[exerciseId]/route.ts` 用 `` `/api/video/${exercise.videoUrl}` `` 拼代理地址，用 `downloadFile(exercise.subtitleUrl)` 下载字幕，二者都要求是 key。
  - `scripts/fix-subtitle-urls.ts` 曾把这两列修正为 key，说明 key 是约定格式。
  - bucket 是私有的（`/api/video/[...key]` 需要签名 URL 才能访问），所以直接匿名 fetch 不能用来校验。
- **Normalization rule**: 输入如果是 `https://{bucket}.cos.{region}.myqcloud.com/{path}`，就取 `{path}` 并做 `decodeURIComponent`；其他 host 一律拒绝；去掉开头的 `/`。
- **Alternatives considered**: 存完整 URL，被否决，因为会破坏现有播放和字幕下载链路。

## R2. 字幕格式与句子数的计算口径

- **Decision**: 格式用 `detectSubtitleFormat(key)` 按扩展名判断。内容用 `downloadFile` 读取后按 UTF-8 解码，句子数取 `parseSubtitles(content, format).length`。
- **Rationale**: 与练习页运行时的逻辑完全一致，保证 SC-003（句子数 100% 一致）。
- **Extra checks**:
  - 解码后含 `U+FFFD`：报"非 UTF-8 编码"，避免运行时出现乱码句子。
  - 解析出的句子数为 0：报错。
  - 取最后一句的 `endTime`，用于和视频时长比较（FR-017）。
- **Alternatives considered**: 按内容嗅探格式，被否决，因为运行时按扩展名解析，两者口径会不一致。

## R3. 视频时长读取（服务端，不下载整个文件）

- **Decision**: 在 `lib/media-probe.ts` 里实现一个最小的 ISO-BMFF（MP4/MOV/M4V）box 解析器，用 HTTP Range 请求签名 URL：
  0. 先调用 `initializeCosClient()`。`getSignedUrl()` 和 `fileExists()` 不会自动初始化 client，未初始化时前者会抛错，后者会静默返回 `false`，导致误报"不存在"。
  1. 用签名 URL 发 `Range: bytes=0-262143` 读取头部 256 KB，**不单独调用 headObject**：
     - 响应状态 404：返回 `NOT_FOUND`；其他非 2xx 状态：返回 `FETCH_FAILED`。
     - 从 `Content-Range: bytes 0-262143/<total>` 解析出文件总大小，用于后续偏移检查。
  2. 遍历顶层 box。找到 `moov` 就进入 `mvhd`，读出 `timescale` 和 `duration`。`mvhd` 的 version 0 和 1 都要支持。
  3. 如果在头部先遇到 `mdat`（moov 在文件尾、非 faststart），根据 box size 算出下一个 box 的偏移（必须小于 total），再用一次 Range 请求读取 `moov`。
  4. `durationSeconds = Math.round(duration / timescale)`。
- **Rationale**:
  - 最多 2 次小范围请求，满足 SC-005（15 秒内）和"大文件不全量下载"的要求。
  - 不引入外部二进制（ffprobe 需要在部署机安装，违反宪法 VI 和部署简洁性）。
  - 约 80 行代码，可以用合成 Buffer 做单元测试。
- **Scope**: 只支持 ISO-BMFF 容器（`.mp4/.m4v/.mov`），这也是浏览器 `<video>` 普遍可播放的格式。其他扩展名直接报"不支持的视频格式"。
- **Alternatives considered**:
  - `ffprobe` / `fluent-ffmpeg`：依赖系统二进制，部署复杂，被否决。
  - `mp4box` npm 包：功能远超需要，体积大，被否决。
  - 浏览器端 `<video>` 的 `loadedmetadata`：结果不可信（违反 FR-016），也无法在服务端复核，被否决，但界面可以照常预览视频。

## R4. 校验超时

- **Decision**: 每个资源只设**一个 10 秒总截止时间**，不按步骤分别计时：
  - 视频：在 `probeVideo` 开头创建一个 `AbortSignal.timeout(10_000)`，两次 Range `fetch` 共用这个 signal。
  - 字幕：用 `Promise.race` 给 `downloadFile` 包一层 10 秒超时（COS SDK 不支持 AbortSignal）。
  - 超时统一报 `TIMEOUT`。视频和字幕并行校验（`Promise.allSettled`），分别返回结果。
- **Rationale**: 每个资源的探测耗时被硬性限制在 10 秒内，两路并行后总耗时也不超过约 10 秒，满足 SC-005；并且能分别给出视频和字幕的错误信息（FR-014）。如果按步骤分别计时，视频的多次请求串行累加，最坏可能达到 20～30 秒。

## R5. 管理员鉴权

- **Decision**:
  - 在 `lib/session.ts` 新增 `requireAdmin(request)`：复用 `requireAuth`，再用 `isAdmin` 判断，不通过返回 403。
  - `proxy.ts` 的 `protectedRoutes` 和 `matcher` 加入 `/api/admin`（Next 16 用 `proxy.ts` 取代了 middleware，见 `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`）。
- **Note**: JWT 里的 role 是登录时签发的，降级管理员要等 token 过期才生效。这一期接受，记录在案。
- **前端**: `/admin` 页面沿用 dashboard 的模式：`localStorage` 里取 token，调 `/api/auth/me`。role ≠ admin 时跳转 `/dashboard`。dashboard 只对 admin 显示"内容管理"入口。前端这层只管体验，真正的安全控制在服务端。

## R6. 统计字段维护

- **Decision**: 新建 Episode 或 Exercise 时，在同一个事务里（`transaction()`）用 `COUNT(*)` 子查询重算上级的 `totalEpisodes`（Season、Series）和 `totalExercises`（Episode），不做 `+1` 增量。
- **Rationale**: 幂等，并能顺便修正历史脚本导入造成的计数偏差。

## R7. UI 组件

- **Decision**: 使用 shadcn 组件。现有的有 Card、Button、Input、Textarea、Dialog、Table、Badge、Collapsible、AlertDialog；需要用 `npx shadcn add` 补充 `select`、`label`、`alert`。层级浏览用 Collapsible，创建表单用 Dialog。
- **Rationale**: 符合宪法 I（shadcn-only）和 IV（桌面端与可访问性）。
