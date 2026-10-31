# Contract: “我的句子”页面 UI 与导出文档

**Feature**: `008-sentence-review-export`

## 1. 路由与入口

| 位置 | 控件 | 行为 |
|---|---|---|
| `app/dashboard/[exerciseId]/sentences/page.tsx` | 新页面 `/dashboard/{exerciseId}/sentences` | `'use client'`、`useParams()`；没有 token 时跳转到 `/` |
| 练习详情页 `app/dashboard/[exerciseId]/page.tsx` | 在现有按钮组中新增 `Button variant="outline"`：**My Sentences**（lucide `NotebookText` 图标） | `router.push('/dashboard/{id}/sentences')` |
| 练习页 `app/dashboard/[exerciseId]/practice/page.tsx` | 头部 “Back” 左侧新增 `Button variant="outline"`：**My Sentences** | 同上（FR-010） |
| 回顾页头部 | `Button variant="outline"`：**Back to exercise** | `router.push('/dashboard/{id}')` |

## 2. 页面布局（桌面端，≥ 1280px）

```text
┌──────────────────────────────────────────────────────────────┐
│ <h1>{exercise.title}</h1>                     [Back to exercise] │
│ My Sentences · {n} sentences                                  │
│ [Switch] Show original                    [Export ▾]          │
├──────────────────────────────────────────────────────────────┤
│ Card                                                          │
│  Sentence 1                                                   │
│  Hi, I'm Mary Alice.                       ← 学习者内容（主文本）│
│  ┌ bg-[#E8F5E9] ────────────────────────────────┐ ← 仅开关打开时  │
│  │ Original: Hi. I'm Mary Alice Young.           │               │
│  └───────────────────────────────────────────────┘               │
│  Sentence 3                                                   │
│  (Skipped)                                 ← userInput 为空时的占位（斜体、灰色）│
│  …                                                            │
└──────────────────────────────────────────────────────────────┘
```

- 列表顺序与接口返回一致（`sentenceIndex` 升序）。句号标签为 `Sentence {sentenceIndex + 1}`。
- 长句通过 `whitespace-pre-wrap break-words` 自动换行，不截断。
- 原文块使用 `bg-[#E8F5E9] text-gray-800 rounded-md px-3 py-2`，必须与 `lib/sentence-export` 中的 `ORIGINAL_BG_HEX` 保持一致。原文块的位置紧跟在对应学习者句子的**正下方**（FR-008、FR-009）。
- 只使用 shadcn 组件：`Card`、`Button`、`Switch`、`Label`、`DropdownMenu*`、`Badge`。

## 3. 控件契约

### 显示原文开关（FR-008、FR-017）

- 组件：`<Switch id="show-original" checked={showOriginal} onCheckedChange={setShowOriginal} />` 加上 `<Label htmlFor="show-original">Show original</Label>`。
- 默认状态为**关闭**，状态不持久化。
- 可访问性：输出 `role="switch"` 和 `aria-checked`，Tab 可以聚焦，Space 可以切换，有可见的焦点环。
- 切换只改变本地 state，不发请求。

### 导出菜单（FR-012、FR-015、FR-017）

- 触发器：`DropdownMenuTrigger` 渲染为 `Button`，文字为 **Export**（lucide `Download` 图标）。导出进行中时文字为 **Exporting…**，同时设置 `disabled` 和 `aria-busy="true"`。
- 菜单项：`Word (.docx)`、`PDF`。可以用方向键选择，回车触发，Esc 关闭。
- `canExport === false`（没有记录或尚未加载完成）时，触发器 `disabled`（FR-011）。
- 点击菜单项后执行以下流程：

  ```text
  setExporting(fmt)
  → const mod = fmt === 'docx'
      ? await import('@/lib/sentence-export/build-docx')
      : await import('@/lib/sentence-export/build-pdf')            // 按需加载（字面量路径，便于打包器分块）
  → blob = await mod.build({ title, exportedAt: new Date(), includeOriginal: showOriginal, sentences })
  → downloadBlob(blob, buildExportFilename(title, fmt, exportedAt))
  → 出错时显示 toast（destructive）：“Export failed. Please try again.”
  → 最后 setExporting(null)
  ```

### 空状态（FR-011）

- 显示一张 `Card`，文案为：`No sentences yet. Practice this exercise and your sentences will appear here.`，并提供 `Button` **Start practicing** 跳转到 `/dashboard/{id}/practice`。此时 Export 不可用，开关可以显示但没有效果。

## 4. 导出文档契约（DOCX 与 PDF 一致，FR-013、FR-016）

**内容顺序**：

1. 标题：`{exercise.title}`（DOCX 用 Title 样式；PDF 用 18pt 加粗）。
2. 副标题：`My Sentences · Exported on YYYY-MM-DD`（本地日期，灰色小字）。
3. 每句一个块，按 `sentenceIndex` 升序排列：
   - `Sentence N` 标签：加粗，10pt，灰色。
   - 学习者内容：12pt 正文；内容为空时显示斜体 `(Skipped)`。
   - 仅在 `includeOriginal === true` 时显示原文块：内容为 `Original: {correctAnswer}`，背景色 **#E8F5E9**，文字颜色 #1F2937，左右各留 6pt 内边距，位于学习者内容正下方。
   - 每个块之后留 10pt 间距。

**不包含**：准确率、逐词反馈、保存时间。

**格式细节**：

| 项 | DOCX（`docx`） | PDF（`@react-pdf/renderer`） |
|---|---|---|
| 纸张 | Word 默认（A4/Letter 由软件决定） | A4，页边距 40pt |
| 原文背景 | 段落 `shading: { type: CLEAR, fill: 'E8F5E9' }` | `<View style={{ backgroundColor: '#E8F5E9' }}>` |
| 字体 | `ascii/hAnsi: Calibri`，`eastAsia: Microsoft YaHei`（不嵌入字体，由阅读器渲染） | 嵌入 `public/fonts/NotoSans-*.ttf`；内容中出现 CJK 或全角字符时整份文档改用 `NotoSansSC-*.ttf` |
| 换行与分页 | Word 自动处理 | `<Text>` 自动换行，`<Page wrap>` 自动分页；句块设置 `wrap={false}`，不跨页拆分 |
| 断字 | — | `Font.registerHyphenationCallback(w => [w])`，禁止自动断字 |

**文件名**（FR-014）：`buildExportFilename(title, ext, date)` 生成 `<清洗后的标题>-我的句子-YYYY-MM-DD.<ext>`。清洗规则见 [research.md R8](../research.md)。

**模块边界**（`lib/sentence-export/`）：

| 文件 | 导出 |
|---|---|
| `index.ts` | `ORIGINAL_BG_HEX`、`SentenceExportInput` 类型、`buildExportFilename`、`containsCjk`、`downloadBlob`（轻量，不引入 docx 或 react-pdf） |
| `build-docx.ts` | `build(input): Promise<Blob>` |
| `build-pdf.tsx` | `build(input): Promise<Blob>`（在这里注册字体） |
