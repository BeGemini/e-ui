# Quickstart: 练习句子记录、回顾页与导出 —— 验证指南

**Feature**: `008-sentence-review-export`

本文只说明如何验证功能，不包含实现代码。接口、数据和 UI 的细节分别见 [contracts/](./contracts/) 和 [data-model.md](./data-model.md)。

## 前置条件

- `.env.local` 中已配置 `DATABASE_URL`，并且数据库里至少有一个带字幕的练习。
- 依赖已安装，包括新增的 `docx` 和 `@react-pdf/renderer`；shadcn 的 `switch` 和 `dropdown-menu` 已生成；`public/fonts/` 下已放好 Noto Sans、Noto Sans SC 字体和 `OFL.txt`。
- 准备两个测试账号 A 和 B。

```bash
npm install
npm run db:migrate          # 执行 005_unique_dictation_attempt.sql
npm run dev
```

## 0. 迁移验证（FR-004b）

迁移前先记录某个已有重复数据的 progress：

```sql
SELECT progressId, sentenceIndex, COUNT(*) c FROM UserDictationAttempt
GROUP BY progressId, sentenceIndex HAVING c > 1;
```

运行 `npm run db:migrate` 后再次执行同一条查询，**期望返回 0 行**。同时用 `SHOW INDEX FROM UserDictationAttempt` 确认存在 `uq_progress_sentence`。保留下来的那一行应是 `attemptDate` 最新的那条。

## 1. 每句一份、覆盖保存（US1、SC-001）

1. 用账号 A 进入练习页，走到第 2 句。
2. 输入 `hello world`，点击 **Check**：反馈立即出现，句子位置**不变**（页头仍显示 `Sentence 2 of …`）。
3. 把输入改成 `hello word`，按 Ctrl+Enter。
4. 点击 **Next Sentence**，确认前进到第 3 句，并且**没有报错 toast**。
5. 点击“上一句”回到第 2 句，输入 `hello words`，点击 **Check**，再点击 **Next Sentence**。
6. 查询数据库：

   ```sql
   SELECT userInput, attemptDate FROM UserDictationAttempt a
   JOIN UserExerciseProgress p USING (progressId)
   WHERE p.userId = '<A>' AND p.exerciseId = '<id>' AND a.sentenceIndex = 1;
   ```

   **期望**：只有 1 行，`userInput = 'hello words'`。
7. 在另一个练习的**第一句**（还没有进度行）直接点击 Check，然后刷新页面。**期望**：句子位置仍是第 1 句，“我的句子”页中出现这一句。
8. 在 DevTools 中把网络设为 Offline 后点击 Check。**期望**：只显示评分失败提示，数据库记录不变（FR-004）。

## 2. 我的句子页面（US2）

1. 在练习详情页点击 **My Sentences**，1 次点击即可进入（SC-003）；在练习页头部也能看到同样的入口。
2. **期望**：页面显示练习标题，列表按 `Sentence 1, 2, 3…` 升序排列，内容与第 1 节保存的一致。如果有 Skip 且输入为空的句子，显示 `(Skipped)`。
3. 开关默认是**关闭**的，此时不显示原文。打开开关后，每句**正下方**立即出现浅绿色（#E8F5E9）背景的原文块，没有网络请求（可在 DevTools Network 面板确认）。关闭开关后原文全部隐藏。
4. 用账号 B 打开同一练习的 `/dashboard/{id}/sentences`。**期望**：B 看不到 A 的任何记录；如果 B 没有记录，则显示空状态，并且 Export 按钮不可用。
5. 打开 `/dashboard/<不存在的id>/sentences`。**期望**：显示 “Exercise not found”。
6. 清除 `localStorage.token` 后访问该页面。**期望**：跳转到登录页。

## 3. 导出（US3、SC-005）

在至少有 10 条记录的页面上：

| 开关 | 格式 | 期望 |
|---|---|---|
| 关 | Word (.docx) | 下载 `<标题>-我的句子-YYYY-MM-DD.docx`。用 Word、WPS 或 LibreOffice 打开，能看到标题、导出日期和按顺序排列的 `Sentence N` 与内容，**不含原文** |
| 开 | Word (.docx) | 每句下方有浅绿底纹的 `Original: …` 段落 |
| 关 | PDF | 下载 `.pdf`，在 Chrome、Preview 或 Acrobat 中都能打开，内容与页面一致 |
| 开 | PDF | 原文块有浅绿背景；同一句没有被拆到两页 |

另外检查以下几点：

- 导出过程中，按钮显示 **Exporting…** 且不能再次点击。用 DevTools 的 Network 面板阻止 `/fonts/*` 后导出 PDF，**期望**出现 “Export failed” toast，页面状态不变。
- 包含 `don't`、`“quoted”`、`well-known`、`… — –` 的句子在两种格式中都能正确显示，没有方块或乱码，英文单词也没有被加上连字符断开。
- 把练习标题临时改成含中文的标题（或者输入一句中文）后导出 PDF。**期望**：中文正常显示（会切换为 Noto Sans SC 字体）。
- 对 200 句的数据（可以用脚本向测试 progress 批量插入）分别导出两种格式，每次都应在 10 秒内完成，且 PDF 正确自动分页。

## 4. 可访问性（US4、FR-017）

- 只使用键盘：按 Tab 聚焦到开关，按 Space 切换；按 Tab 聚焦到 Export，按 Enter 打开菜单，用 ↓ 选择 PDF，再按 Enter 开始下载。全程都应有可见的焦点环。
- 打开 VoiceOver 后，开关应被读作 “Show original, switch, off/on”，菜单项应读出 “Word (.docx)” 和 “PDF”。

## 5. 自动化检查

```bash
npm run type-check
npm run lint
npm run test:unit -- sentence-export
TEST_BASE_URL=http://localhost:3000 npm run test:integration -- sentence-records
```

**期望**：全部通过。集成测试覆盖以下几点：

- 先连续调用两次 save-attempt，再调用一次 save-progress，之后该句只有 1 条记录，且内容为最后一次保存的值；
- save-attempt 不改变 `currentSentenceIndex`；
- 用户之间的记录相互隔离。
