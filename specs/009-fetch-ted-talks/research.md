# Research: TED Talks 视频与字幕采集

**Date**: 2026-11-08

## R1: TED 页面元数据获取

**Decision**: 请求 `https://www.ted.com/talks/<slug>?language=en`，解析 `<script id="__NEXT_DATA__">` 中的 JSON，读取 `props.pageProps.videoData`、`videoData.videoPlayerData` 与 HLS resources。

**Rationale**: 样例页面普通 GET 无需登录或 API Key，内嵌数据同时提供 TED ID、slug、时长和同源播放器资源。项目没有 HTML 解析依赖，针对该 script 标签提取后 `JSON.parse` 即可，并用显式类型守卫检查所需字段。

**Alternatives considered**:
- JSON-LD：有标题与部分媒体信息，但缺少完整播放器和时间轴数据，不单独采用。
- `transcript.json`：实测返回 HTML 而非 JSON，不采用。
- 新增 HTML 解析库：对一个已知 script 标签而言不必要。

**Evidence**: [样例 TED 页面](https://www.ted.com/talks/surya_ganguli_can_ai_match_the_human_brain?language=en)。

## R2: 视频下载与封装

**Decision**: 使用 `videoPlayerData.resources.hls.stream` 作为输入，由同机 `ffmpeg` 自动选择高质量音视频并无损转封装为 MP4，启用 faststart。

**Rationale**: 样例 HLS 主清单及分片可访问，视频/音频通常为 H.264/AAC，stream copy 避免重编码耗时。页面暴露的 h264 MP4 候选地址实测 HEAD/GET 均为 403；旧 `download.ted.com` 地址实测 404。输出临时 MP4 后可流式上传并复用现有 MP4 探测。

**Alternatives considered**:
- 页面 `resources.h264[].file`：样例 403，不可靠。
- 旧 `download.ted.com` 与 `apikey=acme`：样例 404，排除。
- 直接保存 HLS 地址：没有把视频采集到 COS，也不符合现有练习 MP4 校验，排除。
- 独立下载 worker：有部署价值但违反当前 Next.js-only 约束且超出最小范围，排除。

**Evidence**: [样例 HLS 主清单](https://hls.ted.com/project_masters/9884/manifest.m3u8?intro_master_id=9294)。

## R3: 英文字幕与片头时间轴

**Decision**: 请求 `resources.hls.metadata`，从 `subtitles[]` 选择 `code === "en"` 的 `webvtt`，保留 TED 返回的完整 URL；HLS 与 VTT 使用同一时间轴。

**Rationale**: 样例 `full.vtt` 返回完整 WebVTT，325 个 cue 均含开始和结束时间，可直接通过现有 VTT 解析器。样例含 3.504 秒片头：带 `intro_master_id` 的 VTT 首 cue 为 4.335 秒，不带参数为 0.831 秒。保留原 URL 可避免手工偏移导致错位。

**Alternatives considered**:
- 页面 transcript：只有 cue 开始时间，需推算结束时间；片头还需额外偏移，仅作为未来降级方案，本期不增加。
- 旧 `/talks/subtitles/id/<id>/lang/en`：实测 410 Gone，排除。
- 分片字幕：需要合并且存在同步风险，完整 VTT 更简单。

**Evidence**: [HLS metadata](https://hls.ted.com/project_masters/9884/metadata.json?intro_master_id=9294)、[完整英文 WebVTT](https://hls.ted.com/project_masters/9884/subtitles/en/full.vtt?intro_master_id=9294)。

## R4: 请求与任务模型

**Decision**: 使用一个需要管理员权限的 Next.js 长 `POST`，Node runtime，内部总截止 300 秒；客户端展示不确定进度并用 AbortController 隔离弹窗生命周期。

**Rationale**: 当前应用由 PM2 常驻运行，无 serverless 的固定短超时；单请求足以满足每次一个链接和四种界面状态，不需要任务表、轮询或独立队列。`maxDuration = 300` 对部分部署平台只是声明，因此还必须在代码中执行实际超时并终止 ffmpeg 子进程。

**Alternatives considered**:
- 数据库存任务加轮询：支持更长任务和恢复，但引入迁移与状态管理，超出本期范围。
- `after()` 后台执行：响应后无法直接填充当前草稿，也不解决持久状态和取消问题。
- 外部 worker：违反 Constitution III。

**Constraint found**: 当前开发机 `command -v ffmpeg` 失败。实现与真实验证前必须在本机和生产安装；部署反向代理需允许至少 300 秒请求。

## R5: COS 上传与最终校验

**Decision**: 扩展现有 COS wrapper 支持 Node `Stream` 和 ContentType；视频从临时文件流式上传，字节省略为小体积 UTF-8 内容上传；随后调用现有 `probeExercise`。

**Rationale**: 已安装 SDK 的 `PutObjectParams.Body` 类型为 `Buffer | String | Stream`，支持流式上传。现有 `uploadFile` 只接受 Buffer/string，若直接读取整部视频会放大内存。最终复用 probe 可确保输出时长可读、VTT 可解析，并向现有 UI 返回相同结构。

**Alternatives considered**:
- 整文件读为 Buffer 后上传：实现短但大视频内存风险高，排除。
- 采集接口绕过 probe：会让失败素材进入草稿，且创建时仍可能失败，排除。

## R6: UI 与手工流程兼容

**Decision**: 在 `ExerciseFormDialog` 内保留共有 Episode/Title/Difficulty 和 Save 区域，以 shadcn Tabs 包裹两种素材输入；Manual 为默认值。采集成功替换当前视频/字幕路径并采用响应中的 probe，管理员仍须确认并 Save，无需重复验证。

**Rationale**: 现有 Save 已强制要求 `probe.ok`，可自然满足“确认后创建”。共有字段不重复，手动路径的 schema、API 和警告确认逻辑保持不变。

**Alternatives considered**:
- 独立 TED 创建弹窗：重复共有表单并改变用户指定交互，排除。
- 采集成功自动保存：违反规格中的管理员确认要求，排除。

## Risks

- TED 的 `__NEXT_DATA__` 和 HLS metadata 属于内部数据结构，可能变化；必须逐层验证并对缺失字段返回明确失败，而不是生成空素材。
- 部分演讲可能使用外部视频源或没有英文 VTT；本期明确报不支持，不自动选择其他语言。
- TED 内容复制到 COS 前，管理员须确认拥有相应使用权。
- `ffmpeg` 是新增系统级部署依赖；自动化单元测试可 mock，但真实验收不能跳过。
