---

description: "视频播放器倍速播放 - 任务清单"
---

# Tasks: 视频播放器倍速播放

**Input**: `/specs/006-video-playback-speed/` 下的设计文档

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/video-player-playback-speed.md、quickstart.md

**Tests**: plan.md 与 research.md R6 明确要求新增一个组件测试 `tests/unit/video-player-playback-rate.test.tsx`（Jest + jsdom + React Testing Library），因此包含测试任务。实际播放时长、音调、读屏按 `quickstart.md` 手动验证，不新增 Playwright 用例。

**Organization**: 按用户故事分组，每个故事可独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、不依赖未完成任务）
- **[Story]**: 所属用户故事（US1、US2）
- 每个任务都写明了确切文件路径

## 范围说明

- 只修改 `app/components/video-player/VideoPlayer.tsx`，只新增 `tests/unit/video-player-playback-rate.test.tsx`。
- **不修改**：`components/ui/select.tsx`、`app/dashboard/[exerciseId]/practice/page.tsx`、`VideoPlayerProps`、`VideoPlayerRef`、`jest.config.js`、`package.json`。
- 不新增依赖、不新增 shadcn 组件、不做持久化、不注册全局快捷键、不改句尾自动停止逻辑（research R3）、不显式设置 `preservesPitch`（research R4）。

---

## Phase 1: Setup（共享基础）

**Purpose**: 确认基线状态，无需新增依赖或配置

- [X] T001 运行 `npm run type-check`、`npm run lint` 和 `npx jest tests/unit`，记录基线均通过；确认 `jest.config.js` 的 `testMatch` 已包含 `**/*.test.tsx`、`components/ui/select.tsx` 已导出 `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`（只检查，不修改文件）

---

## Phase 2: Foundational（阻塞性前置）

**Purpose**: 定义两个用户故事和测试都要用到的速度常量与类型

**⚠️ CRITICAL**: 本阶段完成前不能开始任何用户故事

- [X] T002 在 `app/components/video-player/VideoPlayer.tsx` 顶部（imports 之后、组件之前）新增并导出 `export const PLAYBACK_RATES = [0.25, 0.5, 1, 1.25, 1.5] as const;`、`export type PlaybackRate = (typeof PLAYBACK_RATES)[number];`、`const DEFAULT_PLAYBACK_RATE: PlaybackRate = 1;`，以及 Select 用的 ``const PLAYBACK_RATE_ITEMS = PLAYBACK_RATES.map((r) => ({ value: r, label: `${r}x` }));``；另加一个类型守卫 `function isPlaybackRate(v: unknown): v is PlaybackRate`（判断 `PLAYBACK_RATES.includes`），不使用 `any`（data-model.md「校验规则」）

**Checkpoint**: 常量/类型就绪，用户故事可以开始

---

## Phase 3: User Story 1 - 选择播放速度收听句子 (Priority: P1) 🎯 MVP

**Goal**: 播放器控制区显示当前速度（默认 1x），可从 0.25x/0.5x/1x/1.25x/1.5x 中选择；选择立即生效且不改变播放/暂停状态与位置；重播、跳句、进入下一句、拖动进度条、视频源重新加载后速度保持。

**Independent Test**: 进入任一练习，默认显示 `1x`；切到 `0.5x` 后点 Replay，该句用时约 2T；切到 `1.5x` 用时约 2T/3；均在句尾停止（quickstart.md §2）。

### Tests for User Story 1 ⚠️

> **NOTE: 先写测试并确认失败，再实现**

- [X] T003 [P] [US1] 新建 `tests/unit/video-player-playback-rate.test.tsx`：文件顶部加 `/** @jest-environment jsdom */`（若 `jest.config.js` 已默认 jsdom 可省略）；`beforeEach` 中 `localStorage.setItem('token', 'test-token')`，`afterEach` 中 `localStorage.clear()`；写一个 `renderPlayer(videoUrl = '/api/videos/a.mp4')` 辅助函数，用 `@testing-library/react` 的 `render` 渲染 `VideoPlayer`，传入满足 `VideoPlayerProps` 的最小 props（含 1–2 条句子的 `sentences`、`currentSentenceIndex: 0`、`onSentenceEnd: jest.fn()` 等，按组件实际 props 定义填写）；用 `await waitFor(() => container.querySelector('video'))` 等待 `<video>` 挂载；不调用 `play()`（jsdom 未实现）
- [X] T004 [US1] 在 `tests/unit/video-player-playback-rate.test.tsx` 中新增用例「默认为 1x」：断言 `screen.getByRole('combobox')` 文本为 `1x`，且 `video.playbackRate === 1`、`video.defaultPlaybackRate === 1`（依赖 T003）
- [X] T005 [US1] 在 `tests/unit/video-player-playback-rate.test.tsx` 中新增用例「选项与选择」：点击 combobox 打开后 `getAllByRole('option')` 恰好 5 项，文本依次为 `0.25x`、`0.5x`、`1x`、`1.25x`、`1.5x`；点击 `0.5x` 后断言 `video.playbackRate === 0.5`、`video.defaultPlaybackRate === 0.5`，触发器文本为 `0.5x`；若 pointer 打开在 jsdom 中不稳定，改用 `fireEvent.keyDown(trigger, { key: 'ArrowDown' })` / `Enter` 操作（research R6）（依赖 T004）
- [X] T006 [US1] 在 `tests/unit/video-player-playback-rate.test.tsx` 中新增用例「换源后保持速度」：选择 `1.25x` 后用 `rerender` 传入不同的 `videoUrl`，等待 `<video>` 的 `src` 更新，模拟浏览器 load 算法先把 `video.playbackRate` 手动设回 `1`，再 `fireEvent.loadedMetadata(video)`，断言 `video.playbackRate === 1.25` 且 `video.defaultPlaybackRate === 1.25`（依赖 T005）

### Implementation for User Story 1

- [X] T007 [US1] 在 `app/components/video-player/VideoPlayer.tsx` 组件内（现有 `useState` 声明之后，约第 45 行）新增 `const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(DEFAULT_PLAYBACK_RATE);`，并新增 `const applyPlaybackRate = useCallback(() => { const video = videoRef.current; if (!video) return; video.defaultPlaybackRate = playbackRate; video.playbackRate = playbackRate; }, [playbackRate]);`（使用组件中已有的 video ref 名称）（依赖 T002）
- [X] T008 [US1] 在 `app/components/video-player/VideoPlayer.tsx` 新增 `useEffect(() => { applyPlaybackRate(); }, [applyPlaybackRate, videoUrlWithToken]);`，覆盖用户切换速度和 `<video>` 在 `videoUrlWithToken` 变为非空后首次挂载的情况（research R2、Edge Case「未加载完成时选择速度」）（依赖 T007）
- [X] T009 [US1] 在 `app/components/video-player/VideoPlayer.tsx` 的 `handleLoadedMetadata`（约第 150 行）开头调用 `applyPlaybackRate()`，并把 `applyPlaybackRate` 加入其 `useCallback` 依赖数组，保证视频源重新加载后速度保持（FR-005）（依赖 T007）
- [X] T010 [US1] 在 `app/components/video-player/VideoPlayer.tsx` 中 `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';`，并在控制区 `<div className="flex items-center justify-center gap-2">`（约第 322 行）内、"Skip & Continue" 按钮之后渲染：`<Select items={PLAYBACK_RATE_ITEMS} value={playbackRate} onValueChange={(v) => { if (isPlaybackRate(v)) setPlaybackRate(v); }}>`，内含 `<SelectTrigger size="sm" className="bg-transparent border-0 text-gray-300 hover:bg-gray-700 hover:text-white rounded">` + `<SelectValue />`，以及 `<SelectContent>` 中按 `PLAYBACK_RATE_ITEMS` 顺序渲染 5 个 `<SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>`；写法参照 `app/components/admin/FormField.tsx` 的 `OptionSelect`；`onValueChange` 收到 `null` 或非法值时忽略（FR-001/003/004/009、contracts §2–§4）（依赖 T008、T009）
- [X] T011 [US1] 阅读 `app/components/video-player/VideoPlayer.tsx` 中 `handleReplay`、`handleSkipReplay`、`playSentenceAtIndex`、`handleSliderChange` 及 `timeupdate` 句尾判定（`time >= endSeconds && time < endSeconds + 0.5`），确认它们不读写 `playbackRate`/`defaultPlaybackRate`，句尾逻辑保持不变（FR-005/006、research R3；只检查，预期无代码改动）（依赖 T010）
- [X] T012 [US1] 运行 `npx jest tests/unit/video-player-playback-rate.test.tsx`，确认 T004–T006 全部通过（依赖 T006、T010）
- [ ] T013 [US1] 按 `specs/006-video-playback-speed/quickstart.md` §2 第 1–10 步在 `npm run dev` 下手动验证 `/dashboard/<exerciseId>/practice`（默认 1x、五档选项、播放中切换不中断、各档用时约 T÷倍速且句尾停止、0.25x 音调自然、连续 10 句速度保持、暂停时切换、刷新回到 1x）（依赖 T012）

**Checkpoint**: User Story 1 完整可用，可单独交付（MVP）

---

## Phase 4: User Story 2 - 键盘操作选择速度 (Priority: P2)

**Goal**: 仅用键盘即可聚焦、打开、选择、关闭速度控件；读屏读出 "Playback speed" 与当前值；有可见焦点样式。

**Independent Test**: 只用 Tab / 方向键 / Enter / Esc 完成一次速度切换，VoiceOver 读出 "Playback speed, combobox, 1x"（quickstart.md §3）。

### Tests for User Story 2 ⚠️

- [X] T014 [US2] 在 `tests/unit/video-player-playback-rate.test.tsx` 中新增用例「可访问名称与键盘操作」：断言 `screen.getByRole('combobox', { name: 'Playback speed' })` 存在且文本为 `1x`；`trigger.focus()` 后用 `fireEvent.keyDown`（`ArrowDown` 打开 → `ArrowDown` 移动 → `Enter` 选择）切换速度，断言 `video.playbackRate` 随之改变、listbox 关闭、`document.activeElement === trigger`；再次打开后按 `Escape`，断言速度不变（先写，确认因缺少 `aria-label` 而失败）（依赖 T010）

### Implementation for User Story 2

- [X] T015 [US2] 在 `app/components/video-player/VideoPlayer.tsx` 的速度 `SelectTrigger` 上添加 `aria-label="Playback speed"` 和 `title="Playback speed"`；确认传入的 `className` 没有覆盖 `SelectTrigger` 自带的 `focus-visible:ring` 类，深色背景下焦点环可见（FR-008、contracts §5、research R5）（依赖 T014）
- [X] T016 [US2] 运行 `npx jest tests/unit/video-player-playback-rate.test.tsx`，确认 T014 通过且 US1 用例无回归（依赖 T015）
- [ ] T017 [US2] 按 `specs/006-video-playback-speed/quickstart.md` §3 第 1–5 步手动验证键盘操作、VoiceOver 朗读和 Lighthouse/axe 可访问性检查（SC-005）（依赖 T016）

**Checkpoint**: User Story 1 与 User Story 2 均可独立验证

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 全局质量门禁与范围确认

- [X] T018 [P] 运行 `npm run type-check`，修复 `app/components/video-player/VideoPlayer.tsx` 与 `tests/unit/video-player-playback-rate.test.tsx` 中的类型错误（无 `any`）
- [X] T019 [P] 运行 `npm run lint`，修复上述两个文件中的 ESLint 问题
- [X] T020 运行 `npx jest` 全量单元测试确认无回归，并用 `git --no-pager diff --stat` 确认改动仅限 `app/components/video-player/VideoPlayer.tsx`、`tests/unit/video-player-playback-rate.test.tsx`、`specs/006-video-playback-speed/`（`components/ui/select.tsx`、`app/dashboard/[exerciseId]/practice/page.tsx`、`package.json` 未改动）（依赖 T018、T019）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，立即开始
- **Foundational (Phase 2)**: 依赖 Setup；阻塞所有用户故事
- **User Story 1 (Phase 3)**: 依赖 Foundational
- **User Story 2 (Phase 4)**: 依赖 US1 的 T010（速度控件必须先渲染出来才能加可访问名称和键盘测试）
- **Polish (Phase 5)**: 依赖所有用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成后即可开始，不依赖其他故事
- **User Story 2 (P2)**: 在 US1 渲染出的同一个 `SelectTrigger` 上补充可访问性，因此依赖 T010；但其验证（键盘/读屏）独立于 US1 的播放时长验证

### Task Graph

```text
T001 → T002 ─┬─ T003 → T004 → T005 → T006 ─┐
             └─ T007 ─┬─ T008 ─┐            │
                      └─ T009 ─┴─ T010 ─┬─ T011
                                        ├────────── T012 → T013
                                        └─ T014 → T015 → T016 → T017
T013, T017 → T018 ∥ T019 → T020
```

### Within Each User Story

- 测试先写并确认失败，再实现
- 常量/类型（T002）→ 状态与同步逻辑（T007–T009）→ UI 控件（T010）→ 验证（T012–T013）
- `VideoPlayer.tsx` 内的任务是同一文件，必须顺序执行

### Parallel Opportunities

- **T003 ∥ T007–T010**：测试文件 `tests/unit/video-player-playback-rate.test.tsx` 与组件文件 `app/components/video-player/VideoPlayer.tsx` 互不冲突，T002 完成后可由两人/两个 agent 同时编写
- **T018 ∥ T019**：type-check 与 lint 互相独立
- 其余任务因集中在同一文件（`VideoPlayer.tsx` 或同一测试文件）而无法并行；本功能体量很小（约 +40 行），并行收益有限

---

## Parallel Example: User Story 1

```bash
# T002 完成后同时启动：
Task: "T003 新建 tests/unit/video-player-playback-rate.test.tsx 及渲染辅助函数（随后 T004–T006）"
Task: "T007 在 app/components/video-player/VideoPlayer.tsx 新增 playbackRate state 与 applyPlaybackRate（随后 T008–T010）"
```

## Parallel Example: Polish

```bash
Task: "T018 npm run type-check"
Task: "T019 npm run lint"
```

---

## Implementation Strategy

### MVP First（仅 User Story 1）

1. 完成 Phase 1（T001）和 Phase 2（T002）
2. 完成 Phase 3（T003–T013）
3. **STOP and VALIDATE**：按 quickstart.md §2 验证；此时速度控件已可用鼠标和 Base UI 默认键盘操作
4. 可直接演示/合并

### Incremental Delivery

1. Setup + Foundational → 常量/类型就绪
2. User Story 1 → 测试 + 手动验证 → MVP
3. User Story 2 → 补 `aria-label`/`title` 与键盘测试 → 满足章程原则 IV 的可访问性要求
4. Polish → type-check、lint、全量 jest、改动范围确认

---

## Notes

- [P] = 不同文件且无未完成依赖
- [Story] 标签用于追溯到 spec.md 中的用户故事
- 不要修改 `components/ui/select.tsx`（shadcn 生成文件）和练习页
- 遵循章程原则 VI：不加持久化、不加快捷键、不重写句尾检测、不新增 e2e
- 每完成一个任务或一组逻辑相关任务后提交（conventional commit，如 `feat: add playback speed control to VideoPlayer`）
