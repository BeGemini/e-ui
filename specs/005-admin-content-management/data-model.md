# Data Model: 后台内容管理

**Feature**: 005-admin-content-management

本功能 **不修改数据库 schema**，复用 `migrations/001_initial_schema.sql` 中已有的表。下面只列出后台写入时用到的字段和校验规则。

## 层级关系

```text
Series 1 ── * Season 1 ── * Episode 1 ── * Exercise
```

所有外键都是 `ON DELETE CASCADE`（本期不提供删除功能，仅作说明）。

## Series

| 字段 | 来源 | 校验规则 |
|---|---|---|
| seriesId | 服务端生成 UUID | — |
| title | 管理员输入 | 必填，trim 后 1–255 字符，全局唯一（冲突时返回 409） |
| difficulty | 管理员输入 | 必填，取值 `beginner` / `intermediate` / `advanced` |
| description | 管理员输入 | 可选 |
| genre | 管理员输入 | 可选，≤100 字符 |
| coverImageUrl | 管理员输入 | 可选，≤500 字符，须为 http(s) URL |
| totalEpisodes | 服务端计算 | 等于该 Series 下所有 Season 的 Episode 总数 |

## Season

| 字段 | 来源 | 校验规则 |
|---|---|---|
| seasonId | 服务端生成 UUID | — |
| seriesId | 上级选择 | 必填，必须存在（不存在返回 404） |
| seasonNumber | 管理员输入 | 必填正整数，同一 Series 内唯一（冲突返回 409） |
| description | 管理员输入 | 可选 |
| totalEpisodes | 服务端计算 | 等于本 Season 下的 Episode 数 |

## Episode

| 字段 | 来源 | 校验规则 |
|---|---|---|
| episodeId | 服务端生成 UUID | — |
| seasonId | 上级选择 | 必填，必须存在（不存在返回 404） |
| episodeNumber | 管理员输入 | 必填正整数，同一 Season 内唯一（冲突返回 409） |
| title | 管理员输入 | 必填，1–255 字符 |
| description | 管理员输入 | 可选 |
| totalExercises | 服务端计算 | 等于本 Episode 下的 Exercise 数 |

## Exercise

| 字段 | 来源 | 校验规则 |
|---|---|---|
| exerciseId | 服务端生成 UUID | — |
| episodeId | 上级选择 | 必填，必须存在（不存在返回 404） |
| title | 管理员输入 | 必填，1–255 字符 |
| difficulty | 管理员输入 | 可选，取值同 Series；为空时沿用 Series 难度 |
| videoUrl | 管理员输入，服务端规范化为 COS key | 必填，≤500 字符，扩展名为 `.mp4/.m4v/.mov`，且必须通过视频探测 |
| subtitleUrl | 管理员输入，服务端规范化为 COS key | 必填，≤500 字符，扩展名为 `.srt/.vtt/.ssa/.ass`，且必须通过字幕探测 |
| subtitleFormat | **服务端提取** | 由 `detectSubtitleFormat(key)` 得出 |
| totalSentences | **服务端提取** | 等于 `parseSubtitles(...).length`，且必须 > 0 |
| durationSeconds | **服务端提取** | 由 MP4 `mvhd` 读取并四舍五入，必须 > 0 |

客户端提交的 `subtitleFormat`、`totalSentences`、`durationSeconds` 一律忽略（FR-016）。

## ResourceProbeResult（瞬态，不落库）

```ts
type ProbeIssue = { code: ProbeErrorCode; message: string };

interface VideoProbe {
  key: string;
  ok: boolean;
  durationSeconds?: number;
  error?: ProbeIssue;
}

interface SubtitleProbe {
  key: string;
  ok: boolean;
  subtitleFormat?: 'srt' | 'vtt' | 'ssa' | 'ass';
  totalSentences?: number;
  lastCueEndSeconds?: number;
  error?: ProbeIssue;
}

interface ExerciseProbeResult {
  video: VideoProbe;
  subtitle: SubtitleProbe;
  warnings: ProbeIssue[];  // 例如 SUBTITLE_EXCEEDS_VIDEO
  ok: boolean;             // video.ok && subtitle.ok
}
```

`ProbeErrorCode` 的取值：`INVALID_KEY`、`FOREIGN_HOST`、`UNSUPPORTED_EXTENSION`、`NOT_FOUND`、`TIMEOUT`、`FETCH_FAILED`、`NOT_ISO_BMFF`、`DURATION_UNREADABLE`、`NOT_UTF8`、`PARSE_FAILED`、`EMPTY_SUBTITLE`、`SUBTITLE_EXCEEDS_VIDEO`（仅用于 warning）。

## 前端表单状态（Exercise 创建）

```text
editing ──(点击"校验")──▶ probing ──▶ probed_ok ──(保存)──▶ saved
                              │            │
                              ▼            └─(修改任一 URL)─▶ editing
                         probed_error ──(修改)──▶ editing
```

- 只有处于 `probed_ok` 时才能保存。
- 如果有 warning，保存前需要先勾选"我已确认"。
- 保存时服务端会重新探测一次（FR-016）。
