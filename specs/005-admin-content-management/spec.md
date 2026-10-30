# Feature Specification: 后台内容管理（Series / Season / Episode / Exercise）

**Feature Branch**: `005-admin-content-management`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "我想做一个后台管理员的功能集，就是用UI来创建 Series, Season, Episode, Exercise 这几张表的数据。其中，在创建 Exercise 表的时候，要去校验提供的 videoUrl 和 subtitleUrl 是否能读取到真实数据，并把他们的 totalSentences, durationSeconds, subtitleFormat 自动读取出来"

## Clarifications

### Session 2026-10-28

- Q: 本期是否需要编辑/删除？ → A: 只做创建 + 浏览，编辑/删除不在本期范围。

## 背景

目前新增练习内容需要开发者手写脚本（如 `scripts/insert-desperate-housewives.ts`）直接写库，`totalSentences`、`durationSeconds`、`subtitleFormat` 需人工计算填写，容易出错且无法由非开发人员完成。本功能为管理员提供可视化的内容录入入口，并在录入练习时自动校验资源与提取元数据。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 创建 Exercise 并自动校验资源、提取元数据 (Priority: P1)

管理员在某个已有 Episode 下创建 Exercise：填写标题、（可选）难度，粘贴视频地址和字幕地址。系统校验两个地址都能读取到真实的视频/字幕内容，并自动得出字幕格式、字幕句子总数、视频时长，展示给管理员确认后保存。

**Why this priority**: 这是用户明确点名的核心诉求，也是手工录入最容易出错的环节（元数据需人工计算）；且 Exercise 是学习者实际使用的内容单元。

**Independent Test**: 在已存在的 Episode 下，输入一个有效视频 URL 和一个有效 SRT 字幕 URL，提交后该 Exercise 出现在学习者的练习列表中，其句子数、时长、格式与资源实际情况一致，且可正常进入练习。

**Acceptance Scenarios**:

1. **Given** 管理员已登录并选择了某个 Episode，**When** 输入可访问的视频 URL 与字幕 URL 并触发校验，**Then** 系统显示自动识别的字幕格式、句子总数、视频时长（以分:秒形式），且这三项不需要管理员手工填写。
2. **Given** 校验通过，**When** 管理员确认保存，**Then** Exercise 被创建并归属于该 Episode，三项元数据与校验结果一致，该 Episode 的练习数量随之更新。
3. **Given** 视频 URL 无法访问（如 404、超时）或内容不是可播放的视频，**When** 触发校验，**Then** 系统在视频字段旁给出明确错误原因，且不允许保存。
4. **Given** 字幕 URL 无法访问、格式不在支持范围（srt/vtt/ssa/ass）内或解析后句子数为 0，**When** 触发校验，**Then** 系统在字幕字段旁给出明确错误原因，且不允许保存。
5. **Given** 校验通过后管理员修改了任一 URL，**When** 尝试保存，**Then** 系统要求针对新 URL 重新校验，旧的元数据不得沿用。

---

### User Story 2 - 创建 Series、Season、Episode 层级 (Priority: P2)

管理员可以创建新的 Series（标题、简介、类型、难度、封面图地址），在 Series 下创建 Season（季号、简介），在 Season 下创建 Episode（集号、标题、简介），从而为 Exercise 搭建归属层级。

**Why this priority**: 没有层级就无法挂载新剧集的练习；但在已有层级下追加 Exercise（P1）即可独立交付价值，因此排在 P1 之后。

**Independent Test**: 从零创建一个 Series → Season 1 → Episode 1，学习者端能看到该 Series 及其层级结构。

**Acceptance Scenarios**:

1. **Given** 管理员在内容管理页，**When** 填写必填信息（标题、难度）创建 Series，**Then** Series 出现在内容列表与学习者端剧集列表中。
2. **Given** 已存在同名 Series，**When** 再次以相同标题创建，**Then** 系统提示标题已存在并拒绝创建。
3. **Given** 某 Series 下已有第 1 季，**When** 再次创建第 1 季，**Then** 系统提示季号重复并拒绝创建；同理，同一季下的集号不可重复。
4. **Given** 管理员在某 Season 下创建 Episode，**When** 保存成功，**Then** 所属 Season 与 Series 的集数统计随之更新。

---

### User Story 3 - 浏览内容层级并定位创建位置 (Priority: P3)

管理员可以以树状/逐级方式浏览 Series → Season → Episode → Exercise，查看每一级已有内容，并在任意层级直接发起"新建下级"操作。

**Why this priority**: 提升录入效率和避免挂错位置，但不影响核心录入能力。

**Independent Test**: 打开内容管理页，可逐级展开现有《Desperate Housewives》数据，并在 Episode 级别点击"新建练习"直接进入 Story 1 的表单且所属 Episode 已预选。

**Acceptance Scenarios**:

1. **Given** 系统中已有内容，**When** 管理员打开内容管理页，**Then** 可逐级查看各级条目及其关键信息（标题/编号、下级数量）。
2. **Given** 管理员在某层级发起"新建下级"，**When** 表单打开，**Then** 上级归属已自动选定。

---

### User Story 4 - 访问控制 (Priority: P1)

只有角色为管理员的已登录用户才能看到和使用内容管理功能；普通用户和未登录访客既看不到入口，也无法通过直接访问地址或接口完成任何创建操作。

**Why this priority**: 安全底线，必须与 P1 同时交付。

**Independent Test**: 使用普通用户账号直接访问管理页面地址及调用创建操作，均被拒绝。

**Acceptance Scenarios**:

1. **Given** 普通用户已登录，**When** 访问内容管理页面，**Then** 被拒绝访问（重定向或无权限提示），导航中不显示入口。
2. **Given** 未登录或非管理员，**When** 直接调用任一创建或校验操作，**Then** 请求被拒绝且不产生任何数据。

### Edge Cases

- 字幕文件扩展名不在 srt/vtt/ssa/ass 之内，或按扩展名对应格式解析失败：报错。格式以扩展名为准，与学习者练习时的识别方式保持一致。
- 字幕文件编码非 UTF-8（如带 BOM、GBK）：需能正确读取或给出编码错误提示，不得静默产生乱码句子。
- 视频文件很大：校验只需读取足以判断有效性和时长的部分，不应因下载整个文件而超时。
- 视频时长无法从文件中读出（元数据缺失）：视为校验失败并提示原因。
- 字幕最后一句的结束时间明显超过视频时长：给出警告提示（不阻止保存），提醒可能视频与字幕不匹配。
- 资源服务器响应慢：校验有超时上限，超时后提示管理员可重试。
- 管理员保存时，所选上级（Series/Season/Episode）已被删除：提示上级不存在并阻止保存。
- 必填字段为空、编号非正整数、URL 格式非法：在提交前即时提示。

## Requirements *(mandatory)*

### Functional Requirements

**访问控制**

- **FR-001**: 系统 MUST 仅允许角色为管理员的已登录用户访问内容管理界面及其所有创建、校验操作。
- **FR-002**: 系统 MUST 在服务端对每一次创建/校验请求重新校验管理员身份，不得仅依赖界面隐藏入口。

**层级内容创建**

- **FR-003**: 管理员 MUST 能创建 Series，字段包括：标题（必填、全局唯一）、难度（必填：beginner/intermediate/advanced）、简介、类型、封面图地址（可选）。
- **FR-004**: 管理员 MUST 能在指定 Series 下创建 Season，字段包括：季号（必填正整数，在该 Series 内唯一）、简介（可选）。
- **FR-005**: 管理员 MUST 能在指定 Season 下创建 Episode，字段包括：集号（必填正整数，在该 Season 内唯一）、标题（必填）、简介（可选）。
- **FR-006**: 管理员 MUST 能在指定 Episode 下创建 Exercise，字段包括：标题（必填）、视频地址（必填）、字幕地址（必填）、难度（可选，覆盖 Series 难度）。
- **FR-007**: 创建成功后，系统 MUST 同步更新上级的统计数量（Series/Season 的集数、Episode 的练习数），保持与学习者端展示一致。
- **FR-008**: 系统 MUST 在违反唯一性或必填约束时拒绝创建，并给出指向具体字段的错误提示。
- **FR-009**: 管理员 MUST 能逐级浏览已有内容，并在任意层级发起创建下级的操作（上级自动预选）。
- **FR-010**: 本期仅提供创建与浏览能力；编辑与删除已有内容不在本期范围内。

**Exercise 资源校验与元数据提取**

- **FR-011**: 系统 MUST 在保存 Exercise 前校验视频地址可访问且内容为可识别的视频，并从中读取视频时长（秒，取整）。
- **FR-012**: 系统 MUST 在保存 Exercise 前校验字幕地址可访问，识别字幕格式（srt/vtt/ssa/ass 之一），并按与学习者练习时相同的解析规则统计句子总数。
- **FR-013**: 字幕格式、句子总数、视频时长 MUST 由系统自动得出并展示给管理员确认，管理员无需也不能手工填写这三项。
- **FR-014**: 若任一资源校验失败，系统 MUST 阻止保存，并分别指出是视频还是字幕出错及原因（不可访问、超时、格式不支持、内容为空/无法解析、无法读取时长等）。
- **FR-015**: 若校验通过后视频或字幕地址被修改，系统 MUST 使之前的校验结果失效并要求重新校验。
- **FR-016**: 系统 MUST 在保存时以服务端校验结果为准，不信任客户端提交的元数据值。
- **FR-017**: 当字幕最后一句结束时间超过视频时长时，系统 SHOULD 显示不匹配警告，但允许管理员确认后继续保存。

### Key Entities *(include if feature involves data)*

- **Series（剧集）**: 顶层内容单元。关键属性：标题（唯一）、简介、类型、难度、封面图、总集数。包含多个 Season。
- **Season（季）**: 属于一个 Series。关键属性：季号（在 Series 内唯一）、简介、集数。包含多个 Episode。
- **Episode（集）**: 属于一个 Season。关键属性：集号（在 Season 内唯一）、标题、简介、练习数。包含多个 Exercise。
- **Exercise（练习）**: 属于一个 Episode，学习者实际练习的单元。关键属性：标题、视频地址、字幕地址、字幕格式、句子总数、视频时长、难度（可选覆盖）。其中字幕格式/句子总数/视频时长由资源自动提取。
- **资源校验结果（临时，不持久化）**: 一次对视频/字幕地址的校验输出：是否可访问、识别出的格式、句子数、时长、错误或警告信息。
- **管理员（User，role=admin）**: 已有用户角色，唯一可执行本功能操作的身份。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 管理员在已有 Episode 下创建一个 Exercise（从打开表单到保存成功）可在 2 分钟内完成，无需任何脚本或数据库操作。
- **SC-002**: 从零创建 Series → Season → Episode → Exercise 完整链路可在 5 分钟内完成。
- **SC-003**: 通过本功能创建的 Exercise，其句子总数与学习者进入练习时实际看到的句子数 100% 一致；视频时长与实际播放时长误差不超过 1 秒。
- **SC-004**: 对无效的视频/字幕地址，100% 在保存前被拦截并显示具体原因。
- **SC-005**: 单次资源校验在资源可正常访问时 15 秒内给出结果。
- **SC-006**: 非管理员身份发起的任何创建/校验请求 100% 被拒绝。
- **SC-007**: 新增内容不再需要编写或运行插入脚本。

## Assumptions

- 管理员身份沿用现有用户体系中的 `admin` 角色，管理员账号的开通方式不在本功能范围内。
- 视频与字幕文件已由管理员预先上传到项目使用的对象存储（腾讯云 COS），本功能只接收资源地址（对象路径，或该存储桶的完整链接），不包含文件上传。
- 支持的字幕格式与现有练习功能一致：srt、vtt、ssa、ass；"句子数"口径与学习者练习时使用的现有字幕解析规则一致（即原始字幕条目数，不含用户个人合并/跳过配置）。
- 管理界面仅面向桌面浏览器（与整个应用一致，见宪法原则 IV）。
- 单次只创建一条记录，批量导入不在本期范围内。
- 编辑、删除已有内容不在本期范围内（如需修正，暂沿用现有方式处理），可在后续迭代中补充。
- 知识点（Knowledge Points）、AI 教学等其他关联内容的录入不在本期范围内。
