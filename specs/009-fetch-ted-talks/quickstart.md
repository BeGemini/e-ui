# Quickstart: TED Talks 视频与字幕采集

本指南验证真实管理员工流，以及解析、错误处理和现有 Manual 回归。接口字段见 [contracts/fetch-ted-talks.md](contracts/fetch-ted-talks.md)，状态与完整性规则见 [data-model.md](data-model.md)。

## Prerequisites

- 项目依赖已安装，现有 `.env.local` 具备可使用的数据库、管理员认证和 COS 配置。
- 本地与生产服务器均安装 `ffmpeg`，运行 Next.js 的用户可执行：

  ```bash
  ffmpeg -version
  ```

  macOS 可用 `brew install ffmpeg`；Linux 部署机使用其系统包管理器安装。不要在采集请求中动态安装。
- 若 Next.js 前存在反向代理，将 `/api/admin/exercises/fetch-ted` 的读取超时配置为至少 300 秒。
- 准备管理员账号及一个可用于测试的 Series / Season / Episode。
- 真实验证会访问 TED 并在 COS 的 `TED/` 下创建对象；优先使用测试 bucket，并确认有权使用所采集内容。

## Automated Checks

```bash
npx jest --runInBand tests/unit/ted-fetch-route.test.ts tests/unit/media-probe.test.ts tests/unit/lib/subtitle-parser.test.ts
npx eslint app/components/admin/ExerciseFormDialog.tsx app/components/admin/admin-client.ts app/api/admin/exercises/fetch-ted/route.ts lib/ted-talk.ts lib/ted-media.ts lib/cos-client.ts
npm run type-check
npm run lint
npm run build
```

启动测试服务器后，运行现有管理集成测试以确认新端点的 401/403 和既有创建行为：

```bash
npm run dev
# 另一个终端；管理员凭证存在时也会执行真实内容创建套件
npm run test:integration -- --runInBand tests/integration/admin-content.test.ts
```

## End-to-End: Fetch TED Talks

1. 以管理员登录并打开 `/admin`，新建或选中测试 Episode，然后打开 New exercise。
2. 确认弹窗只有 **Manual** 和 **Fetch TED Talks** 两个 tab，默认是 Manual；Episode、Title、Difficulty 行为保持不变。
3. 切换到 **Fetch TED Talks**，输入：

   ```text
   https://www.ted.com/talks/surya_ganguli_can_ai_match_the_human_brain
   ```

4. 启动采集。按钮在任务期间禁用并显示进行中状态，不得因重复点击产生第二个任务。
5. 在 300 秒内确认成功状态，Video 与 Subtitle 显示同一 `TED/` 目录下的 `.mp4` 和 `.vtt` COS 对象键，练习尚未自动创建。
6. 确认界面采用采集响应中的资源探测结果：视频可读取时长、字幕格式为 VTT、句子数大于零、`probe.ok` 为 true；也可点击 **Validate resources** 再次检查。
7. 点击 **Save exercise**。打开该练习，确认视频可播放、拖动进度可用、英文字幕与语音一致。样例保留 TED 片头，首条字幕应与片头后的时间轴一致，不应整体提前约 3.5 秒。
8. 在 COS 中确认两个对象都存在；MP4 使用 `video/mp4`，VTT 为 UTF-8 且可解析。

## Error and Lifecycle Checks

- 空值、`https://example.com/video`、TED 搜索页和非演讲路径：立即显示 URL 字段错误，不发起采集。
- 不存在的 Talk slug：返回 `TALK_NOT_FOUND`，保留输入，不填充资源路径。
- 无英文 VTT 或无受支持 HLS 的 Talk：分别显示对应素材不可用，不把其他语言或外部视频静默作为成功结果。
- 采集中关闭弹窗，再立即新建另一份练习：旧请求不得覆盖新草稿；服务器收到取消后终止处理并清理临时文件。
- 模拟 TED、ffmpeg 或 COS 失败：显示契约中的稳定错误，允许用同一链接重试，不创建练习，也不把部分素材标为成功。

## Manual Regression

1. 重新打开 New exercise，确认默认选中 Manual。
2. 按现有方式输入已知有效的 COS MP4 与 SRT/VTT 路径，完成 Validate resources 和 Save exercise。
3. 确认格式、句子数、时长和警告确认行为与改动前一致。
4. 在 Fetch tab 失败后切回 Manual，确认可以手动输入且失败结果不会覆盖手动路径。
