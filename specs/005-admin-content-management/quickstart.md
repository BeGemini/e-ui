# Quickstart: 验证后台内容管理

## 前置条件

- `.env.local` 已配置数据库和 COS（与现有练习功能使用同一套）。
- 已有一个 `role = 'admin'` 的账号。如果没有，在数据库执行 `UPDATE User SET role='admin' WHERE email='<你的邮箱>';`，然后**重新登录**（role 写在 JWT 里）。
- COS 中已上传一组可用的测试资源，例如一个 `.mp4` 视频和一个 `.srt` 或 `.ass` 字幕。另外准备一个不存在的 key，用来验证失败路径。

## 运行

```bash
npm run dev
npm run type-check && npm run lint
npm run test:unit -- media-probe
npm run test:integration -- admin
```

## 验证场景

| # | 操作 | 预期结果 | 对应需求 |
|---|---|---|---|
| 1 | 普通用户登录后访问 `/admin` | 跳转到 `/dashboard`，页头没有"内容管理"入口 | US4, FR-001 |
| 2 | 用普通用户 token 调 `POST /api/admin/series` | 403，数据库无变化 | FR-002, SC-006 |
| 3 | 管理员在 `/admin` 新建 Series → Season 1 → Episode 1 | 树中逐级出现，学习者端剧集列表可见，计数正确 | US2, FR-007 |
| 4 | 重复创建同名 Series，或同一 Series 下重复的季号 | 表单字段旁显示"已存在" | FR-008 |
| 5 | 在 Episode 下新建练习，填入有效的视频和字幕 key，点击"校验" | 显示格式、句子数、时长（分:秒），保存按钮可用 | US1-1, FR-013 |
| 6 | 保存后进入该练习的练习页 | 句子数与校验结果一致，视频可正常播放 | SC-003 |
| 7 | 视频填写不存在的 key 并校验 | 视频字段报"文件不存在"，不能保存 | FR-014 |
| 8 | 字幕使用 `.txt` 扩展名，或使用空字幕文件 | 字幕字段报"不支持的格式"或"字幕为空" | FR-014 |
| 9 | 校验通过后修改字幕 key | 元数据清空，保存按钮禁用，需要重新校验 | FR-015 |
| 10 | 字幕最后一句的结束时间超过视频时长 | 出现警告，勾选确认后可以保存 | FR-017 |
| 11 | 粘贴完整的 COS 链接（`https://{bucket}.cos.{region}.myqcloud.com/...`） | 保存后数据库中存的是规范化后的 key | R1 |

接口细节见 [contracts/admin-api.md](./contracts/admin-api.md)，字段规则见 [data-model.md](./data-model.md)。
