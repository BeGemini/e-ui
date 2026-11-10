# Research: 视频播放器倍速播放

**Feature**: `006-video-playback-speed` | **Date**: 2026-10-30

Technical Context 中没有 NEEDS CLARIFICATION 项。下面记录几个需要对照现有代码确认的设计点。

---

## R1. 速度控件选用哪个 shadcn 组件

**Decision**: 使用仓库已有的 shadcn `Select`（`components/ui/select.tsx`，底层是 `@base-ui/react/select`），触发器放在播放器控制区现有三个按钮的右侧。

**Rationale**:
- 章程原则 I 要求只用 shadcn 组件；`Select` 已安装，并已在 `app/components/admin/FormField.tsx` 中使用（`items` + `value` + `onValueChange` 的写法），可以照搬。
- Base UI Select 自带键盘交互：Tab 聚焦，Enter/Space/方向键打开，方向键移动，Enter 选择，Esc 关闭，关闭后焦点回到触发器。触发器渲染为 `role="combobox"`，选中项带 `aria-selected`。这些覆盖了 User Story 2 和 FR-008，不需要自己写键盘逻辑。
- 打开后点一次就能选中，满足 SC-001（不超过 2 次点击）。
- `Select.Root` 的 Value 是泛型，可以直接用 `number` 作为值，不用做字符串转换。

**Alternatives considered**:
- 5 个并排的 `Button`（或 toggle group）：控制区会变得拥挤，而且仓库没有 `toggle-group` 组件，还要额外安装。不采用。
- 点击循环切换速度的单个按钮：最快需要点 4 次才能到目标速度，违反 SC-001。不采用。
- `DropdownMenu`：仓库没有安装；`Select` 本来就有"当前值"的语义，读屏体验更好。不采用。

---

## R2. 如何把速度应用到 `<video>`，并在视频源重新加载后保持

**Decision**:
- 在 `VideoPlayer` 内部用 `useState` 保存 `playbackRate`（默认 `1`）。
- 用一个 `applyPlaybackRate()` 同时设置 `video.defaultPlaybackRate` 和 `video.playbackRate`。以下三处调用它：
  1. `useEffect`，依赖 `[playbackRate, videoUrlWithToken]`，处理用户切换速度和 `<video>` 首次挂载；
  2. `handleLoadedMetadata`，处理视频源变化后的重新加载；
  3. 选择回调本身（可选，让速度立即生效）。

**Rationale**:
- 按 HTML 规范，media element 的 load 算法会把 `playbackRate` 重置为 `defaultPlaybackRate`。`<video src>` 变化时（访问凭证刷新等）就会触发 load。如果只设 `playbackRate`，换源后会回到 1x。同时设置 `defaultPlaybackRate`，再在 `loadedmetadata` 时补设一次，可以覆盖这种情况（满足 FR-005 和"视频源重新加载"边界情况）。
- 现有代码中，`<video>` 要等 `videoUrlWithToken` 有值后才渲染（之前显示 "Loading video..." 占位）。effect 依赖 `videoUrlWithToken`，所以即使用户在占位阶段就选了速度，元素挂载后也会生效（满足"未加载完成时选择速度"边界情况）。
- 设置 `playbackRate` 不会改变 `paused` 状态和 `currentTime`，满足 FR-004。现有的重播（`handleReplay`）、跳句（`handleSkipReplay`）、`playSentenceAtIndex`、拖动进度条（`handleSliderChange`）都只改 `currentTime` 或调用 `play()`，不会重置速度，满足 FR-005。
- 速度只保存在组件状态里。练习页在会话期间不会卸载 `VideoPlayer`（只在首次加载或 `exerciseId` 变化时显示 loading 分支），所以切换句子时速度保持；刷新页面或重新进入时组件重新挂载，速度回到 1x（满足 FR-002、FR-010）。

**Alternatives considered**:
- 把状态提升到 `practice/page.tsx` 并通过 props 传入：页面不需要知道速度，提升状态只会增加 props 和耦合。不采用。
- 存到 `localStorage` 或用户偏好：spec 明确不跨会话保存。不采用。

---

## R3. 非 1x 速度下的句尾自动停止（FR-006 / SC-003）

**Decision**: 保留现有基于 `timeupdate` 的判断（`time >= endSeconds && time < endSeconds + 0.5`），不改代码。

**Rationale**:
- HTML 规范规定 `timeupdate` 的触发间隔为 15–250ms（墙钟时间）。在 r 倍速下，两次事件之间媒体时间最多前进 `0.25 × r` 秒。最高 1.5x 时最多前进 0.375s，小于 0.5s 的判定窗口，因此不会错过停止点。
- 以墙钟时间计算，越过句尾的最大时长在各种速度下都是约 250ms，和 1x 的现状一样，所以听感上"与 1x 时行为一致"。低速下越过的媒体时间反而更少（0.25x 时 ≤ 0.0625s）。

**Alternatives considered**:
- 改用 `requestAnimationFrame` 或 `requestVideoFrameCallback` 高频轮询：精度更高，但会改动现有已验证的逻辑，超出本需求范围（章程原则 VI）。如果将来需要统一提升精度，再单独立项。

---

## R4. 低速时的音调（FR-007）

**Decision**: 不写额外代码，依赖 `HTMLMediaElement.preservesPitch` 的默认值 `true`。

**Rationale**: Chrome、Edge、Firefox、Safari 等现代桌面浏览器在改变 `playbackRate` 时默认保持音调（`preservesPitch` 默认 `true`，TS 的 `lib.dom.d.ts` 已有该属性）。项目只支持桌面浏览器（章程原则 IV）。显式再设一次属于多余代码。

**Alternatives considered**: 显式设置 `video.preservesPitch = true`。没有收益，不采用；手动验收中会听一下 0.25x 的效果来确认。

---

## R5. 控件的可访问名称与显示文案

**Decision**:
- 触发器设置 `aria-label="Playback speed"`，`title="Playback speed"`，显示当前值（如 `1x`）。
- 选项文案为 `0.25x`、`0.5x`、`1x`、`1.25x`、`1.5x`，按从慢到快排列。

**Rationale**:
- 现有播放器和练习页的界面文案都是英文（`title="Replay"`、`"Skip & Continue"`、`"Sentence 1 / N"`），因此可访问名称也用英文，与 spec 中"播放速度"的语义一致。
- 本仓库的 `SelectTrigger` 在没有 `Field`/`Label` 包裹时不会设置 `aria-labelledby`（已检查 `SelectTrigger.js` 的 `resolveAriaLabelledBy`），所以 `aria-label` 能生效。读屏会读成"Playback speed, combobox, 1x"。
- 显示格式用 `${rate}x`。JS 数字转字符串时会自然得到 `0.25`、`0.5`、`1`、`1.25`、`1.5`，与 spec 的"数值 + x"一致。

---

## R6. 测试方式

**Decision**:
- 新增一个 Jest + React Testing Library 组件测试 `tests/unit/video-player-playback-rate.test.tsx`（jsdom）。覆盖：默认显示 1x 且 `video.playbackRate === 1`；选择速度后 `video.playbackRate` 和 `defaultPlaybackRate` 更新；改变 `videoUrl` 并触发 `loadedmetadata` 后速度保持。
- 实际播放时长（SC-002）和读屏效果（SC-005）按 `quickstart.md` 手动验证。

**Rationale**:
- `jest.config.js` 已配置 `jest-environment-jsdom`，也已安装 `@testing-library/react`。jsdom 的 `HTMLMediaElement` 实现了 `playbackRate`/`defaultPlaybackRate` 的读写（已检查 `HTMLMediaElement-impl.js`），但不会真正播放，`play()` 未实现。所以测试只断言属性，不调用播放。
- 这是仓库第一个 `.tsx` 组件测试，`jest.config.js` 的 `testMatch` 已包含 `**/*.test.tsx`，不需要改配置。
- 如果 Base UI Select 在 jsdom 中用 pointer 事件打开不稳定，就改用键盘事件（`focus` + `ArrowDown`/`Enter`）操作，或直接用 `getByRole('option')` 点击。
- 不新增 Playwright 用例：现有 e2e 依赖种子账号和真实视频，测倍速效果的成本高、收益低（章程原则 VI）。
