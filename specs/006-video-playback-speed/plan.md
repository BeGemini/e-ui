# Implementation Plan: 视频播放器倍速播放

**Branch**: `006-video-playback-speed` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-video-playback-speed/spec.md`

## Summary

在练习页使用的 `app/components/video-player/VideoPlayer.tsx` 控制区中加一个 shadcn `Select` 速度控件，提供 0.25x、0.5x、1x、1.25x、1.5x 五档，默认 1x。

- 速度保存在组件内部的 `useState` 中。
- 通过同时设置 `<video>` 的 `defaultPlaybackRate` 和 `playbackRate` 来生效，并在 `loadedmetadata` 时补设一次，这样视频源重新加载后速度也能保持（research R2）。
- 现有的句尾自动停止逻辑（`timeupdate` + 0.5s 窗口）在 1.5x 下最多越过 0.375s 媒体时间，仍在窗口内，所以不需要修改（research R3）。
- 不改 props/ref 接口，不改练习页，不涉及服务端、数据库或持久化。

## Technical Context

**Language/Version**: TypeScript 5（strict）、React 19.2、Next.js 16.3（App Router）

**Primary Dependencies**: 已有的 shadcn `Select`（`@base-ui/react` 1.8）、`Button`、`Slider`，以及 lucide-react。**不新增依赖，也不新增 shadcn 组件。**

**Storage**: N/A（只有组件内存状态）

**Testing**: Jest 29 + jsdom + @testing-library/react（新增一个组件测试）；其余按 `quickstart.md` 手动验证

**Target Platform**: 桌面浏览器（Chrome、Edge、Firefox、Safari 最新版），视口 ≥ 1280px

**Project Type**: Next.js 全栈 Web 应用（本功能只涉及前端）

**Performance Goals**: 切换速度立即生效（同一帧内设置属性），不引入额外的渲染或轮询

**Constraints**: 不暂停、不跳转；句尾停止行为与 1x 一致；不注册全局快捷键；不跨会话保存

**Scale/Scope**: 改动 1 个组件文件（约 +40 行），新增 1 个测试文件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 结论 | 说明 |
|---|---|---|
| I. shadcn-First | ✅ | 速度控件用已安装的 shadcn `Select` 系列组件，不写原生 `<select>`/`<button>`。（播放器中原有的 `<video>`/`<div>` 是现状，本功能不新增裸 HTML 交互元素） |
| II. Type Safety | ✅ | `PLAYBACK_RATES` 用 `as const`，并推导出 `PlaybackRate` 字面量联合类型；`Select` 的泛型值为 `number`；没有 `any` |
| III. Full-Stack Next.js Only | ✅ | 纯前端改动，不涉及 API 或外部服务 |
| IV. Desktop Web & Accessible | ✅ | 只按桌面视口设计；Base UI Select 提供 combobox/listbox 语义和完整键盘交互；触发器有 `aria-label` 和可见焦点环；不增加移动端适配 |
| V. Code Quality & Testing | ✅ | 新增 RTL 组件测试；需要通过 `npm run lint` 和 `npm run type-check` |
| VI. Avoid Over-Engineering | ✅ | 状态不提升到页面，不做持久化，不加快捷键，不重写句尾检测，不显式设置 `preservesPitch`，不新增 e2e |

**Post-Design Re-check**: ✅ Phase 1 设计完成后复查，结论不变，没有违规项，Complexity Tracking 为空。

## Project Structure

### Documentation (this feature)

```text
specs/006-video-playback-speed/
├── spec.md
├── plan.md              # 本文件
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── video-player-playback-speed.md   # Phase 1：组件 UI/a11y 契约
├── checklists/
└── tasks.md             # Phase 2（/speckit.tasks 生成，本命令不创建）
```

### Source Code (repository root)

```text
app/components/video-player/
└── VideoPlayer.tsx        # 修改：新增 PLAYBACK_RATES、playbackRate state、
                           #   applyPlaybackRate（effect + handleLoadedMetadata）、
                           #   控制区中的 Select 控件

components/ui/
└── select.tsx             # 复用，不修改

app/dashboard/[exerciseId]/practice/
└── page.tsx               # 不修改

tests/unit/
└── video-player-playback-rate.test.tsx   # 新增：RTL 组件测试
```

**Structure Decision**: 沿用现有 Next.js 单项目结构。改动集中在 `VideoPlayer.tsx`。常量和类型与使用位置放在一起（章程 Code Structure Standards："Colocate types with their usage"），不放进 `lib/types.ts`。

## 实现要点（供 /speckit.tasks 拆分）

1. `VideoPlayer.tsx`：
   - 引入 `Select, SelectContent, SelectItem, SelectTrigger, SelectValue`；
   - 定义 `PLAYBACK_RATES`、`PlaybackRate`，以及 `items`（``{ value: r, label: `${r}x` }``）；
   - 新增 `const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1)`；
   - 新增 `applyPlaybackRate`（设置 `defaultPlaybackRate` 和 `playbackRate`）；在 `useEffect([playbackRate, videoUrlWithToken])` 和 `handleLoadedMetadata` 中调用；
   - 在控制区按钮之后渲染 Select，样式与按钮一致，`aria-label`/`title` 设为 "Playback speed"。
2. `tests/unit/video-player-playback-rate.test.tsx`：默认 1x；选择后属性更新；`rerender` 换 `videoUrl` 并 `fireEvent.loadedMetadata` 后速度保持。测试前在 `localStorage` 中设置 token，这样 `<video>` 会渲染。
3. 按 `quickstart.md` 手动验证。

## Complexity Tracking

无违规项。
