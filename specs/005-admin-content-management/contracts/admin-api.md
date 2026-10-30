# Contract: Admin Content API

所有接口：

- 都需要请求头 `Authorization: Bearer <JWT>`，且用户 role 必须是 `admin`。
- 缺少或无效 token 返回 **401**；非管理员返回 **403** `{ "error": "Forbidden: admin only" }`。
- 请求体用 zod 校验，失败返回 **400** `{ "error": string, "fieldErrors": Record<string, string[]> }`。
- 上级不存在返回 **404** `{ "error": string, "field": "seriesId|seasonId|episodeId" }`。
- 唯一性冲突返回 **409** `{ "error": string, "field": string }`。

---

## GET `/api/admin/content`

返回完整内容树，用于后台浏览。

**200**

```json
{
  "series": [{
    "seriesId": "uuid", "title": "string", "difficulty": "intermediate", "totalEpisodes": 1,
    "seasons": [{
      "seasonId": "uuid", "seasonNumber": 1, "totalEpisodes": 1,
      "episodes": [{
        "episodeId": "uuid", "episodeNumber": 1, "title": "Pilot", "totalExercises": 1,
        "exercises": [{
          "exerciseId": "uuid", "title": "Full Version", "subtitleFormat": "ass",
          "totalSentences": 512, "durationSeconds": 2580
        }]
      }]
    }]
  }]
}
```

---

## POST `/api/admin/series`

**Body**

```json
{ "title": "string", "difficulty": "beginner|intermediate|advanced", "description": "string?", "genre": "string?", "coverImageUrl": "string?" }
```

**201** `{ "seriesId": "uuid" }` · 400 · 409（field: `title`）

---

## POST `/api/admin/seasons`

**Body**

```json
{ "seriesId": "uuid", "seasonNumber": 1, "description": "string?" }
```

**201** `{ "seasonId": "uuid" }` · 400 · 404 · 409（field: `seasonNumber`）

---

## POST `/api/admin/episodes`

**Body**

```json
{ "seasonId": "uuid", "episodeNumber": 1, "title": "string", "description": "string?" }
```

**201** `{ "episodeId": "uuid" }` · 400 · 404 · 409（field: `episodeNumber`）

副作用：在同一事务内重算所属 Season 和 Series 的 `totalEpisodes`。

---

## POST `/api/admin/exercises/probe`

校验资源并提取元数据。只读，不写库。

**Body**

```json
{ "videoUrl": "string", "subtitleUrl": "string" }
```

**200**：无论探测成功还是失败都返回 200，结果放在 body 里。

```json
{
  "ok": true,
  "video":    { "key": "Show/S01/E01.mp4", "ok": true, "durationSeconds": 2580 },
  "subtitle": { "key": "Show/S01/E01.ass", "ok": true, "subtitleFormat": "ass", "totalSentences": 512, "lastCueEndSeconds": 2571.4 },
  "warnings": []
}
```

失败示例：

```json
{
  "ok": false,
  "video":    { "key": "Show/S01/E01.mp4", "ok": false, "error": { "code": "NOT_FOUND", "message": "视频文件不存在" } },
  "subtitle": { "key": "Show/S01/E01.srt", "ok": true, "subtitleFormat": "srt", "totalSentences": 480, "lastCueEndSeconds": 2500.2 },
  "warnings": []
}
```

400：请求体缺少字段，或字段不是字符串。

---

## POST `/api/admin/exercises`

**Body**

```json
{ "episodeId": "uuid", "title": "string", "difficulty": "beginner|intermediate|advanced|null?", "videoUrl": "string", "subtitleUrl": "string" }
```

服务端会重新执行 probe。如果客户端额外提交了 `subtitleFormat`、`totalSentences`、`durationSeconds`，直接忽略。

- **201** `{ "exerciseId": "uuid", "probe": ExerciseProbeResult }`
- **422** `{ "error": "Resource validation failed", "probe": ExerciseProbeResult }`：probe 未通过
- 400 · 404

副作用：在同一事务内重算所属 Episode 的 `totalExercises`。

---

## UI Contract

| 路由 | 访问控制 | 内容 |
|---|---|---|
| `/admin` | 前端：非 admin 跳转 `/dashboard`；服务端接口返回 403 | 内容树（Collapsible），每一级都有"新建下级"按钮，顶部有"新建 Series" |
| `/dashboard` 页头 | 仅 role=admin 时显示 | 进入 `/admin` 的入口链接 |
