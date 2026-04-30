# 🎨 Token Canvas - AI 创意工作台

**一站式 AI 图像、视频和音频生成工作流平台**

</div>

---

## ⚠️ 重要警告 - 请务必阅读

> **博主郑重提醒：自接 API 平台存在较大风险！**

### 🚨 风险警示

很多小型 API 中转商/平台可能会：

- ❌ **跑路风险**：充值后平台消失，血本无归
- ❌ **服务不稳定**：经常宕机、接口报错
- ❌ **数据安全**：你的 API Key 和生成内容可能被泄露
- ❌ **无售后**：出问题找不到人

### ✅ 推荐方案

如果你的**出图量和出视频量较大**，强烈建议使用正规大厂服务：

| 推荐平台   | 官网                                 | 价格优势                                                      |
| ---------- | ------------------------------------ | ------------------------------------------------------------- |
| **献丑AI** | [xianchou.com](https://xianchou.com) | Banana Pro 4K 仅 **0.2元/张**，Sora 2 顶配参数仅 **4积分/条** |

> 💡 大厂服务稳定、有保障、不跑路，长期使用更划算！

---

## 📋 项目简介

Token Canvas 是一个功能强大的 AI 创意工作台，提供直观的可视化界面，让你轻松创建和管理 AI 生成工作流。

### ✨ 核心功能

- 🖼️ **图像生成**：支持多种 AI 图像模型，包括 Banana Pro、Flux 2、Midjourney 等
- 🎬 **视频生成**：支持 Sora 2、Veo 3.1、Kling 等视频生成模型
- 🎵 **音频生成**：支持 Suno 等音乐生成模型
- 🔄 **工作流编排**：通过拖拽节点创建复杂的生成工作流
- 📱 **响应式设计**：适配不同屏幕尺寸
- 🌙 **深色/浅色主题**：支持主题切换
- 💾 **本地存储**：保存你的项目和配置
- 📤 **导出/导入**：方便备份和分享配置

---

## ⚙️ 环境要求

- Node.js 18 或更高版本
- npm、pnpm 或 yarn 包管理器

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/token-canvas.git
cd token-canvas
```

### 2. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install

# 或使用 yarn
yarn install
```

### 3. 启动开发服务器

```bash
# 使用 npm
npm run dev

# 或使用 pnpm
pnpm dev

# 或使用 yarn
yarn dev
```

### 4. 配置 API

1. 打开应用后，点击左侧菜单的 ⚙️ 设置图标
2. 在全局配置中设置你的 API Base URL 和 API Key
3. 或为特定模型单独配置 API 设置
4. 点击「测试连接」按钮验证配置是否正确

---

## 📁 项目结构

```
├── App.tsx                 # 主应用组件
├── components/
│   ├── Canvas.tsx          # 画布组件，用于节点拖拽和连接
│   ├── Sidebar.tsx         # 侧边栏，包含节点选择和工具
│   ├── Nodes/              # 各种类型的节点组件
│   │   ├── BaseNode.tsx    # 基础节点组件
│   │   ├── TextToImageNode.tsx  # 文本到图像节点
│   │   ├── TextToVideoNode.tsx  # 文本到视频节点
│   │   └── ...             # 其他节点类型
│   └── Settings/           # 设置相关组件
│       ├── SettingsModal.tsx     # 模型接口配置
│       ├── StorageModal.tsx      # 存储设置
│       └── ExportImportModal.tsx # 导出导入配置
├── services/
│   ├── mode/               # 模型配置和 API 调用
│   │   ├── config.ts       # 模型注册表
│   │   ├── types.ts        # 类型定义
│   │   ├── image/          # 图像生成模型实现
│   │   ├── video/          # 视频生成模型实现
│   │   └── audio/          # 音频生成模型实现
│   ├── geminiService.ts    # 服务入口
│   └── storageService.ts   # 存储服务
└── types.ts                # 全局类型定义
```

---

## 🎯 使用指南

### 创建工作流

1. **添加节点**：从侧边栏拖拽节点到画布
2. **连接节点**：点击一个节点的输出端口，然后点击另一个节点的输入端口
3. **配置节点**：点击节点打开配置面板，设置参数
4. **运行工作流**：点击节点上的运行按钮开始生成

### 模型分类

- **图像模型**：用于生成和编辑图像
- **视频模型**：用于生成视频
- **音频模型**：用于生成音乐和音效

### 快捷键

- `V`：选择模式
- `H`：移动模式
- `Ctrl + S`：保存当前视图
- `Ctrl + Z`：撤销
- `Ctrl + Y`：重做

---

## 🔧 模型配置

### 支持的模型

#### 图像模型

- Banana Pro
- Banana 2
- seedream 5
- seedream 4.5
- seedream 4
- Midjourney
- Qwen Zimage
- Flux Pro
- Kling Image

#### 视频模型

- Sora 2
- Veo 3.1 Fast
- Veo 3.1 Pro
- 海螺 2.0
- 海螺 2.3
- Kling O1 Pro
- 即梦 3.5
- Kling 2.5 Pro
- Qwen Wan 2.6
- Qwen Wan 2.5
- Grok Video 3

#### 音频模型

- Suno Music

### API 配置说明

本项目默认适配了 [New API](https://docs.newapi.pro) 标准格式，但由于各家 API 服务商的实现差异，可能需要根据你的 API 服务商文档进行调整。

**常见配置项**：

- **Base URL**：API 服务的基础 URL，如 `https://newapi.asia/`
- **API Key**：你的 API 密钥
- **Model ID**：模型的标识符
- **Endpoint**：API 端点路径

---

## 🛠️ 故障排除

### 常见问题

1. **API 连接失败**
   - 检查 Base URL 是否正确
   - 验证 API Key 是否有效
   - 确认网络连接正常

2. **生成失败**
   - 检查模型参数是否正确
   - 查看浏览器控制台是否有错误信息
   - 验证 API 服务商是否正常运行

3. **界面问题**
   - 尝试刷新页面
   - 清除浏览器缓存
   - 确认浏览器版本是否支持

### 日志和调试

- 浏览器控制台：查看 API 请求和错误信息
- 网络面板：检查 API 响应状态

---

## 🤝 贡献

欢迎提交 Issue 和 PR！如果你有任何建议或问题，请在 GitHub 仓库中创建 Issue。

### 贡献步骤

1. Fork 项目
2. 创建你的功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- 感谢所有贡献者的努力
- 感谢各 AI 模型提供商的服务
- 感谢使用和支持本项目的用户

---

<div align="center">
Made with ❤️ by Token Canvas Team
</div>
