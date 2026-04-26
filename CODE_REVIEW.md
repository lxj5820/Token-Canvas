# Token Canvas · 代码审查标准与流程

> 基于项目实际代码扫描结果制定，最后更新：2026-04-26

---

## 一、为什么需要这份文档

当前项目存在以下已确认的质量问题（扫描结果，非猜测）：

| 问题类型 | 数量/位置 | 风险 |
|---------|-----------|------|
| 空 `catch` 块（吞掉异常） | 5 处（storageService×2, useWorkflowIO×3） | 🔴 静默失败 |
| `params: any` 在核心 hook 接口 | useGeneration×2 | 🟡 类型安全失效 |
| `saveWorkflow(workflowData: any)` | indexedDbService.ts:48 | 🟡 DB 写入无类型保障 |
| `onChange={(val: any) => ...}` 大量散布 | 组件层 20+ 处 | 🟡 回调参数无约束 |
| `console.error` 直接暴露 | useGeneration×5, App.tsx:329 | 🟡 应走 logger |
| `let interval: any` | ImageToVideoNode, StartEndToVideoNode, TextToAudioNode | 🟡 应为 `ReturnType<typeof setInterval>` |
| App.tsx 行数 | 1117 行 | 🟡 职责边界模糊 |

---

## 二、优先级定义

```
🔴 阻塞（Blocker）   — PR 必须修复才能合并
🟡 建议（Suggest）   — 本次 PR 应修复；无法修复须创建 Issue 跟踪
💭 挑剔（Nit）       — 可选，不阻塞合并
```

---

## 三、审查清单（按优先级）

### 🔴 阻塞级

#### B1 — 禁止空 catch 块

```typescript
// ❌ 错误：异常被吞掉，调试无从下手
} catch (e) {}

// ✅ 正确：至少用 logger 记录，或重新抛出
} catch (e) {
  logger.warn('saveCache failed, skipping', e);
}
```

**当前违规位置：**
- `services/storageService.ts` 第 501、513 行
- `hooks/useWorkflowIO.ts` 第 182、214、222 行

**修复方式：** 评估每处是否真的可以忽略。可以忽略的加注释说明原因；不能忽略的加 `logger.warn`。

---

#### B2 — 接口层禁止裸 `any`

```typescript
// ❌ 接口定义中的 any 会让 TS 失去追踪能力
async saveWorkflow(workflowData: any): Promise<void>
async handleAngleGenerate(nodeId: string, params: any)

// ✅ 至少定义一个最小结构
interface WorkflowData {
  id: string;
  nodes: NodeData[];
  connections: Connection[];
  [key: string]: unknown; // 允许扩展但保留核心类型
}
```

**当前违规位置：**
- `services/indexedDbService.ts:48` — `saveWorkflow(workflowData: any)`
- `hooks/useGeneration.ts:150` — `handleAngleGenerate(nodeId, params: any)`
- `hooks/useGeneration.ts:309` — `handleLightGenerate(nodeId, params: any)`

**为什么重要：** `params: any` 就是一个类型黑洞，调用方传什么都不会报错，错误只在运行时暴露。

---

#### B3 — `catch` 块的异常变量必须被使用

```typescript
// ❌ 捕获了 e 但从不用它
} catch (e) {
  alert('生成失败');
}

// ✅ 将异常信息传递出去
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  logger.error('生成失败', e);
  alert(`生成失败: ${msg}`);
}
```

---

### 🟡 建议级

#### S1 — `console.*` 替换为 `logger`

项目已有 `services/logger.ts`，但核心文件仍直接用 `console.error`：

```typescript
// ❌ 直接使用 console
console.error(e);

// ✅ 走 logger（支持生产环境关闭）
import { logger } from '../services/logger';
logger.error('handleGenerate failed', e);
```

**当前违规位置：** `useGeneration.ts` 第 141、261、299、413、508 行；`App.tsx` 第 329 行

---

#### S2 — interval/timeout 类型明确化

```typescript
// ❌ 模糊类型
let interval: any;
interval = setInterval(() => {...}, 1000);

// ✅ 精确类型
let interval: ReturnType<typeof setInterval> | null = null;
interval = setInterval(() => {...}, 1000);
clearInterval(interval!);
```

**当前违规位置：** `ImageToVideoNode.tsx:140`、`StartEndToVideoNode.tsx:147`、`TextToAudioNode.tsx:105`

---

#### S3 — 事件回调 `onChange` 参数类型化

```typescript
// ❌ val 的类型不明
onChange={(val: any) => updateData(data.id, { model: val })}

// ✅ 根据组件实际传出的类型标注
onChange={(val: string) => updateData(data.id, { model: val })}
```

重复出现 20+ 处，优先处理 `model`、`resolution`、`count` 这三个字段（影响核心生成逻辑）。

---

#### S4 — 文件长度控制

| 文件 | 当前行数 | 建议 |
|------|---------|------|
| `App.tsx` | 1117 行 | 目标 < 400 行，已拆出多个 hook，继续拆分 handler 层 |
| 较大的 Node 组件（如 `StartEndToVideoNode.tsx`） | 待测量 | 超过 400 行应考虑拆分子组件 |

**App.tsx 拆分方向：**
- 各 `handleXxxGenerate` 回调 → 收拢进对应 hook（`useGeneration` 已在做这件事）
- Modal 状态（`isSettingsOpen` 等）→ `useModalState` hook
- 项目名编辑逻辑 → `useProjectName` hook

---

#### S5 — `workflowValidator.ts` 类型守卫完善

```typescript
// 现状：参数全是 any，守卫形同虚设
function isValidNode(node: any): node is NodeData
function isValidConnection(conn: any): conn is Connection

// 建议：入口参数改为 unknown，让守卫发挥真正的作用
function isValidNode(node: unknown): node is NodeData {
  return (
    typeof node === 'object' && node !== null &&
    typeof (node as NodeData).id === 'string' &&
    // ...
  );
}
```

---

#### S6 — NodeData 字段膨胀控制

`types.ts` 的 `NodeData` 接口目前有 ~25 个字段，仍在增长。

**建议策略：** 用判别联合类型替代大平铺

```typescript
// 基础字段
interface BaseNodeData {
  id: string; type: NodeType; x: number; y: number;
  width: number; height: number; title: string;
}

// 各类节点专有字段通过联合类型区分
type NodeData = BaseNodeData & (
  | { type: NodeType.TEXT_TO_IMAGE; prompt?: string; model?: string; ... }
  | { type: NodeType.ORIGINAL_IMAGE; imageSrc?: string; annotations?: AnnotationItem[]; ... }
  | ...
);
```

这样 TypeScript 能在 `switch(node.type)` 分支里自动收窄类型。

---

### 💭 挑剔级

#### N1 — `useGeneration.ts` 中的 useRef 模式

```typescript
// 当前用 Ref 同步所有 props 的模式
const nodesRef = useRef(nodes);
useEffect(() => { nodesRef.current = nodes; });  // 每次渲染都同步
```

这个模式是为了在 `useCallback(fn, [])` 中读取最新值，本身没有严重错误，但容易误导。建议在注释中说明原因，或考虑迁移到 `useEffectEvent`（React 19 已稳定）。

---

#### N2 — 魔法字符串改枚举

```typescript
// ❌ 分散在各处的字符串字面量
activeToolbarItem?: string;  // 实际值是 'annotation' | 'gridSplit' | 'angleEdit' 等

// ✅ 用枚举或 as const 约束
export type ToolbarItem = 'annotation' | 'gridSplit' | 'angleEdit' | 'lightEdit';
activeToolbarItem?: ToolbarItem;
```

---

## 四、具体审查流程

### 4.1 提交前自查（作者）

在发起 PR 前，作者应在本地执行以下检查：

```powershell
# 1. 检查空 catch 块
Select-String -Path "**/*.ts","**/*.tsx" -Pattern "catch\s*\(\w+\)\s*\{\s*\}" -Recurse

# 2. 检查接口层裸 any（services/ 和 hooks/ 目录）
Select-String -Path "services\*.ts","hooks\*.ts" -Pattern ":\s*any\b" -Encoding UTF8

# 3. 检查直接 console 调用（logger 之外的文件）
Select-String -Path "**/*.ts","**/*.tsx" -Pattern "console\.(log|warn|error)" -Recurse |
  Where-Object { $_.Filename -ne "logger.ts" }

# 4. TypeScript 编译检查
npx tsc --noEmit
```

### 4.2 PR 描述模板

```markdown
## 变更内容
<!-- 一句话描述做了什么 -->

## 影响范围
- [ ] 新增节点类型或 NodeData 字段
- [ ] 修改了 services/ 层（涉及 DB 或网络）
- [ ] 修改了 hooks/useGeneration（影响生成流程）
- [ ] 修改了类型定义 types.ts

## 自查清单
- [ ] 无空 catch 块
- [ ] 接口参数无裸 any（或已创建 Issue 跟踪）
- [ ] console.* 已替换为 logger
- [ ] `npx tsc --noEmit` 通过
- [ ] 手动测试受影响的节点类型
```

### 4.3 审查者关注点

**第一轮（正确性）**
- [ ] 核心流程：生成 → 保存 → 渲染链路是否完整
- [ ] 错误处理：catch 块有没有把 loading 状态复位（`isLoading: false`）
- [ ] 互斥状态：新增编辑模式是否在其他模式开启时正确关闭（参考 `isAnnotating/isAngleEditing/isLightEditing` 的互斥逻辑）

**第二轮（可维护性）**
- [ ] 新字段加进 `NodeData` 是否有必要，还是可以放在组件本地 state
- [ ] 是否出现了 `handleRatioChange` 之类的重复实现（已有 5 处相同逻辑）
- [ ] `updateData(id, partial)` 模式是否一致使用

**第三轮（安全/数据）**
- [ ] Canvas 操作（drawImage）是否处理了 CORS 图片跨域问题
- [ ] IndexedDB 写入是否有超配额 `QuotaExceededError` 的处理
- [ ] 用户输入的 prompt 是否有长度/内容基本校验（防止 API 层抛错）

---

## 五、已知技术债务（跟踪清单）

| ID | 位置 | 问题 | 优先级 | 状态 |
|----|------|------|--------|------|
| TD-01 | `App.tsx` (1117 行) | 单文件过大，handler 逻辑需继续向 hooks 迁移 | P1 | 进行中 |
| TD-02 | `indexedDbService.ts:48` | `saveWorkflow(any)` 无类型 | P1 | 待处理 |
| TD-03 | `hooks/useGeneration.ts:150,309` | `params: any` 在 AngleGenerate/LightGenerate | P1 | 待处理 |
| TD-04 | `workflowValidator.ts` | 守卫函数入参全是 `any` | P2 | 待处理 |
| TD-05 | `storageService.ts:501,513` + `useWorkflowIO.ts:182,214,222` | 5 处空 catch 块 | P1 | 待处理 |
| TD-06 | `NodeData` 接口 | 字段膨胀，建议改为判别联合类型 | P2 | 待处理 |
| TD-07 | `handleRatioChange` 等 | 5 处重复逻辑未提取 | P2 | 待处理 |

---

## 六、什么时候可以豁免规则

**S 级和 N 级规则可在以下情况豁免：**
1. 第三方库类型定义不完整，无法避免 `any` → 用 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 加注释说明原因
2. 空 catch 是故意"尝试失败就跳过" → 加注释 `// intentionally swallow: reason here`
3. 临时调试代码（`console.log`）→ PR 合并前必须移除，无豁免

**B 级规则没有豁免。**

---

## 七、一句话原则

> **让下一个读代码的人（可能是3个月后的你）不需要跑代码就能理解它在做什么，以及为什么这样做。**
