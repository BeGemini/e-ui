# Data Model: TED Talks 视频与字幕采集

本功能不新增持久化数据库实体。以下模型存在于单次采集请求和当前新建练习弹窗中；最终仅复用现有 Exercise 创建记录。

## TedTalkSource

| Field | Type | Rules |
|---|---|---|
| `url` | `string` | HTTPS；hostname 精确为 `www.ted.com`；path 为 `/talks/<slug>`，不含额外路径段 |
| `slug` | `string` | 从 path 取得，非空；仅用于读取页面和安全对象命名 |
| `tedId` | `string` | 来自已验证的页面 `videoData.id`，非空 |
| `title` | `string` | 来自页面，仅作元数据/日志，不自动覆盖管理员标题 |
| `canonicalUrl` | `string \| undefined` | 可选页面元数据，不作为任意抓取地址 |

## TedMediaResources

| Field | Type | Rules |
|---|---|---|
| `hlsStreamUrl` | `string` | 来自 `videoData.videoPlayerData.resources.hls.stream`；HTTPS 且属于允许的 TED 媒体域名 |
| `hlsMetadataUrl` | `string` | 来自同一 `resources.hls.metadata`；保留原查询参数 |
| `englishVttUrl` | `string` | metadata `subtitles[]` 中 `code === "en"` 的 `webvtt`；不得用其他语言替代 |
| `durationSeconds` | `number \| undefined` | 页面声明时长，仅作合理性检查，最终时长以 COS probe 为准 |

**Relationship**: 三个 URL 必须来自同一次页面解析和同一播放器资源。HLS 与 VTT 的片头参数保持一致，不单独移除 `intro_master_id`。

## FetchOperation

| Field | Type | Rules |
|---|---|---|
| `status` | `"idle" \| "fetching" \| "success" \| "error"` | 客户端可见状态；空闲和采集中等提示均由该状态派生 |
| `sourceUrl` | `string` | 保留管理员输入，失败后不得清空 |
| `videoKey` | `string \| null` | 仅上传与 probe 成功后设置；COS `.mp4` 对象键 |
| `subtitleKey` | `string \| null` | 仅上传与 probe 成功后设置；COS `.vtt` 对象键 |
| `probe` | `ExerciseProbeResult \| null` | 任一资源变化时清空；成功响应中为 `ok: true` |
| `errorCode` | `TedFetchErrorCode \| null` | 失败时用于显示稳定、可操作的错误消息 |
| `errorMessage` | `string \| null` | 不向用户暴露凭证、服务器路径或堆栈 |

### State Transitions

```text
idle ──有效提交──> fetching ──上传且 probe 成功──> success
  │                  │
  │                  ├──TED/媒体/COS/超时失败──> error ──重试──> fetching
  │                  └──关闭弹窗/中止───────────> 卸载，不更新任何新草稿
  └──无效提交──────> idle（显示字段错误）
```

- `fetching` 时禁止重复提交。
- 新任务必须使旧任务结果失效；已卸载弹窗不接收状态更新。
- `success` 只表示素材就绪，不表示 Exercise 已创建。
- 进入 `success` 后采用响应中的 probe，并由管理员通过现有 Save 操作确认；也可重新 Validate，任一资源路径手动改变后回到未校验状态。

## UploadedMedia

| Field | Type | Rules |
|---|---|---|
| `videoKey` | `string` | `TED/<tedId>-<safeSlug>/<uuid>.mp4` |
| `subtitleKey` | `string` | 与视频同目录、同 UUID 的 `.vtt` |
| `videoContentType` | `string` | `video/mp4` |
| `subtitleContentType` | `string` | `text/vtt; charset=utf-8` |
| `probe` | `ExerciseProbeResult` | `video.ok` 与 `subtitle.ok` 均为 true；字幕格式为 VTT，句子数大于零 |

**Integrity rules**:
- 两个对象都上传且 probe 成功才返回成功响应。
- 任一步失败都删除临时文件；尽力清理本次已上传的不完整对象，不触碰其他键。
- 服务端创建练习时仍再次执行现有 probe，客户端返回结果不是最终持久化依据。

## Exercise Draft (existing)

沿用现有 `episodeId`、`title`、`difficulty`、`videoUrl`、`subtitleUrl`、`probe` 和警告确认状态。采集成功仅更新 `videoUrl` 与 `subtitleUrl`，不会自动提交或发布 Exercise。

## Validation and Error Categories

- 请求格式：`INVALID_URL`。
- 页面不可用：`TALK_NOT_FOUND`、`UPSTREAM_FETCH_FAILED`。
- 素材缺失：`VIDEO_UNAVAILABLE`、`ENGLISH_SUBTITLES_UNAVAILABLE`。
- 本地处理：`FFMPEG_UNAVAILABLE`、`MEDIA_CONVERSION_FAILED`。
- 存储/校验：`STORAGE_UPLOAD_FAILED`、`RESOURCE_VALIDATION_FAILED`。
- 截止：`TIMEOUT`。

具体 HTTP 映射见 [contracts/fetch-ted-talks.md](contracts/fetch-ted-talks.md)。
