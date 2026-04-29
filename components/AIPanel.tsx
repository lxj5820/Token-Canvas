import React, { useState, useRef, useEffect } from "react";
import { Icons } from "./Icons";

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

// AI 模型配置
type AIModel = string;

interface ModelInfo {
  id: AIModel;
  name: string;
  defaultUrl: string;
  defaultModel: string;
  isCustom?: boolean;
}

interface CustomModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  modelName: string;
}

// AI 模型配置列表
const MODELS: ModelInfo[] = [
  {
    id: "gemini-3.1-flash-lite-preview",
    name: "gemini-3.1-flash",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "gemini-3.1-flash-lite-preview",
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "gemini-3.1-pro",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "gemini-3.1-pro-preview",
  },
  {
    id: "gpt-5.4",
    name: "gpt-5.4",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "gpt-5.4",
  },
  {
    id: "gpt-5.5",
    name: "gpt-5.5",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "gpt-5.5",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude 4.6",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "claude-sonnet-4-6-20250514",
  },
  {
    id: "claude-opus-4-7",
    name: "Claude 4.7",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    id: "glm-5",
    name: "glm-5",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "glm-5",
  },
  {
    id: "glm-5.1",
    name: "glm-5.1",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "glm-5.1",
  },
  {
    id: "deepseek-v4-pro",
    name: "deepseek-v4-pro",
    defaultUrl: "https://newapi.asia/",
    defaultModel: "deepseek-v4-pro",
  },
];

interface ChatModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

// 消息配置
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

// 全局提示词优化函数注册表
let globalOptimizePrompt: ((prompt: string) => Promise<string>) | null = null;
export const registerOptimizePrompt = (
  fn: (prompt: string) => Promise<string>,
) => {
  globalOptimizePrompt = fn;
};
export const getOptimizePrompt = () => globalOptimizePrompt;

export const AIPanel: React.FC<AIPanelProps> = ({
  isOpen,
  onClose,
  isDark,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [customModels, setCustomModels] = useState<CustomModelConfig[]>(() => {
    const saved = localStorage.getItem("ai-custom-models");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [allModels, setAllModels] = useState<ModelInfo[]>([...MODELS]);
  const [selectedModel, setSelectedModel] = useState<AIModel>(MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [newCustomModel, setNewCustomModel] = useState<CustomModelConfig>({
    id: "",
    name: "",
    baseUrl: "https://newapi.asia/",
    modelName: "",
  });

  // 合并预设模型和自定义模型
  useEffect(() => {
    const customModelInfos: ModelInfo[] = customModels.map((cm) => ({
      id: cm.id,
      name: cm.name,
      defaultUrl: cm.baseUrl,
      defaultModel: cm.modelName,
      isCustom: true,
    }));
    setAllModels([...MODELS, ...customModelInfos]);
  }, [customModels]);

  const [modelConfig, setModelConfig] = useState<ChatModelConfig>(() => {
    const saved = localStorage.getItem("ai-model-config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    // 默认配置
    return {
      apiKey: "",
      baseUrl: "https://newapi.asia/",
      model: MODELS[0].name,
    };
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 注册优化函数到全局
  useEffect(() => {
    registerOptimizePrompt(optimizePromptFunc);
  }, [modelConfig, selectedModel]);

  const saveAllConfigs = () => {
    localStorage.setItem("ai-model-config", JSON.stringify(modelConfig));
    setShowSettings(false);
  };

  const updateModelConfig = (field: keyof ChatModelConfig, value: string) => {
    setModelConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addCustomModel = () => {
    if (!newCustomModel.name || !newCustomModel.modelName) return;
    const modelId = newCustomModel.id || `custom-${Date.now()}`;
    const updatedCustomModels = [
      ...customModels,
      { ...newCustomModel, id: modelId },
    ];
    setCustomModels(updatedCustomModels);
    localStorage.setItem("ai-custom-models", JSON.stringify(updatedCustomModels));
    setNewCustomModel({
      id: "",
      name: "",
      baseUrl: "https://newapi.asia/",
      modelName: "",
    });
    setShowCustomModel(false);
  };

  const removeCustomModel = (modelId: string) => {
    const updatedCustomModels = customModels.filter((m) => m.id !== modelId);
    setCustomModels(updatedCustomModels);
    localStorage.setItem("ai-custom-models", JSON.stringify(updatedCustomModels));
    if (selectedModel === modelId) {
      setSelectedModel(MODELS[0].id);
    }
  };

  const callAI = async (
    model: AIModel,
    messages: Message[],
  ): Promise<string> => {
    const config = modelConfig;
    if (!config?.apiKey) {
      throw new Error("请先配置 API Key");
    }

    const modelInfo = allModels.find((m) => m.id === model);
    if (!modelInfo) throw new Error("未知模型");

    // 自定义模型使用自己的 baseUrl 和 modelName
    let baseUrl = config.baseUrl;
    let modelName = model;
    if (modelInfo.isCustom) {
      const customModel = customModels.find((cm) => cm.id === model);
      if (customModel) {
        baseUrl = customModel.baseUrl;
        modelName = customModel.modelName;
      }
    }
    
    // 标准化 baseUrl：移除末尾斜杠
    baseUrl = baseUrl.replace(/\/$/, "");

    if (model.startsWith("claude")) {
      // Anthropic API
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 4096,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API 错误: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0]?.text || "";
    } else if (model.startsWith("glm")) {
      // 智谱 API
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API 错误: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    } else {
      // OpenAI 兼容 API (包括 DeepSeek 和自定义模型)
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API 错误: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    }
  };

  const optimizePromptFunc = async (prompt: string): Promise<string> => {
    if (!modelConfig?.apiKey) {
      throw new Error("请先在 AI 助手中配置 API Key");
    }

    const systemPrompt = `你是一个专业的提示词优化助手。请将用户提供的提示词进行优化，使其更适合用于 AI 图片/视频生成。

要求：
1. 保持原意不变，但表达更加精确、生动
2. 增加细节描述（光影、色彩、构图、氛围等）
3. 去除口语化表达，使用更适合生成模型的描述性语言
4. 如果原提示词是中文，保持中文输出；如果是英文，保持英文输出
5. 只输出优化后的提示词，不要添加解释说明`;

    const messagesToSend = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    const result = await callAI(selectedModel, messagesToSend as Message[]);
    return result.trim();
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const reply = await callAI(selectedModel, [...messages, userMessage]);

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生错误");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
  };

  const hasApiKey = !!modelConfig?.apiKey;

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed right-0 top-0 h-full w-[400px] z-[200] border-l shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col ${
          isDark ? "bg-[#0B0C0E] border-zinc-800" : "bg-white border-gray-200"
        }`}
      >
        {/* 标题栏 */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-zinc-800" : "border-gray-200"}`}
        >
          <div className="flex items-center gap-2">
            <Icons.Sparkles
              size={18}
              className={isDark ? "text-yellow-400" : "text-yellow-600"}
            />
            <span
              className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              AI 助手
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-zinc-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
              title="清空聊天"
            >
              <Icons.Trash2 size={16} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${showSettings ? (isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-50 text-yellow-600") : isDark ? "hover:bg-zinc-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
              title="API 设置"
            >
              <Icons.Settings size={16} />
            </button>
            <button
              title="关闭面板"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-zinc-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
            >
              <Icons.X size={16} />
            </button>
          </div>
        </div>

        {/* API 设置 */}
        {showSettings && (
          <div
            className={`p-4 border-b ${isDark ? "border-zinc-800 bg-zinc-900/50" : "border-gray-200 bg-gray-50"}`}
          >
            <div
              className={`text-xs font-medium mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              统一 API 配置
            </div>
            <p
              className={`text-xs mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              所有模型共享相同的 API 配置
            </p>

            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={modelConfig.apiKey || ""}
                    onChange={(e) =>
                      updateModelConfig("apiKey", e.target.value)
                    }
                    placeholder="输入 API Key"
                    className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border ${
                      isDark
                        ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
                    title="显示/隐藏 API Key"
                  >
                    {showApiKey ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Base URL
                </label>
                <input
                  type="text"
                  value={modelConfig.baseUrl || ""}
                  onChange={(e) => updateModelConfig("baseUrl", e.target.value)}
                  placeholder="https://newapi.asia/"
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${
                    isDark
                      ? "bg-zinc-800 border-zinc-700 text-white placeholder-gray-500"
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                  }`}
                />
              </div>


            </div>

            <div className="mt-4">
              <button
                onClick={saveAllConfigs}
                className="w-full py-2 text-sm font-medium rounded-lg bg-yellow-500 text-white hover:bg-yellow-400 transition-colors"
              >
                保存配置
              </button>
            </div>
          </div>
        )}

        {/* 模型选择 */}
        <div
          className={`px-4 py-2 border-b ${isDark ? "border-zinc-800" : "border-gray-200"}`}
        >
          <div className="flex flex-wrap gap-1.5 items-center">
            {allModels.map((model) => {
              const isSelected = selectedModel === model.id;

              return (
                <div key={model.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedModel(model.id)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                      isSelected
                        ? isDark
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : "bg-yellow-50 text-yellow-600 border border-yellow-200"
                        : isDark
                          ? "bg-zinc-800 text-gray-400 border border-zinc-700 hover:border-zinc-600"
                          : "bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {model.name}
                    {hasApiKey && (
                      <span className="ml-1 text-green-500">✓</span>
                    )}
                  </button>
                  {model.isCustom && (
                    <button
                      onClick={() => removeCustomModel(model.id)}
                      className={`p-0.5 rounded ${
                        isDark
                          ? "hover:bg-red-500/20 text-red-400"
                          : "hover:bg-red-100 text-red-600"
                      }`}
                      title="删除自定义模型"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => setShowCustomModel(!showCustomModel)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                isDark
                  ? "bg-zinc-800 text-gray-400 border border-dashed border-zinc-600 hover:border-zinc-400"
                  : "bg-gray-100 text-gray-600 border border-dashed border-gray-400 hover:border-gray-600"
              }`}
            >
              + 添加模型
            </button>
          </div>
          {/* 自定义模型表单 */}
          {showCustomModel && (
            <div
              className={`mt-3 p-3 rounded-lg ${
                isDark ? "bg-zinc-800/50" : "bg-gray-100"
              }`}
            >
              <div className="space-y-3">
                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    模型显示名称
                  </label>
                  <input
                    type="text"
                    value={newCustomModel.name}
                    onChange={(e) =>
                      setNewCustomModel((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="例如：我的自定义模型"
                    className={`w-full px-2 py-1.5 text-xs rounded border ${
                      isDark
                        ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={newCustomModel.baseUrl}
                    onChange={(e) =>
                      setNewCustomModel((prev) => ({
                        ...prev,
                        baseUrl: e.target.value,
                      }))
                    }
                    placeholder="https://api.example.com/v1"
                    className={`w-full px-2 py-1.5 text-xs rounded border ${
                      isDark
                        ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    模型 ID/名称
                  </label>
                  <input
                    type="text"
                    value={newCustomModel.modelName}
                    onChange={(e) =>
                      setNewCustomModel((prev) => ({
                        ...prev,
                        modelName: e.target.value,
                      }))
                    }
                    placeholder="例如：gpt-4o"
                    className={`w-full px-2 py-1.5 text-xs rounded border ${
                      isDark
                        ? "bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                    }`}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addCustomModel}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-yellow-500 text-white hover:bg-yellow-400 transition-colors"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomModel(false);
                      setNewCustomModel({
                        id: "",
                        name: "",
                        baseUrl: "https://newapi.asia/",
                        modelName: "",
                      });
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg ${
                      isDark
                        ? "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex flex-col">
          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`text-4xl mb-3`}>
                  <Icons.Cpu />
                </div>
                <h3
                  className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  你好，我是词元画布助手
                </h3>
                <p
                  className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  选择模型开始对话
                </p>
                {!hasApiKey && (
                  <p
                    className={`text-xs mt-2 ${isDark ? "text-yellow-400" : "text-yellow-500"}`}
                  >
                    当前模型未配置 API Key
                  </p>
                )}
              </div>
            )}

            {error && (
              <div
                className={`p-3 rounded-xl text-sm mb-4 ${isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-200"}`}
              >
                {error}
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 mb-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    msg.role === "user"
                      ? isDark
                        ? "bg-yellow-500/20"
                        : "bg-yellow-100"
                      : isDark
                        ? "bg-zinc-800"
                        : "bg-gray-100"
                  }`}
                >
                  {msg.role === "user" ? "👤" : <Icons.Cpu size={16} />}
                </div>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? isDark
                        ? "bg-yellow-500 text-white rounded-tr-sm"
                        : "bg-yellow-500 text-white rounded-tr-sm"
                      : isDark
                        ? "bg-zinc-800 text-gray-200 rounded-tl-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 mb-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isDark ? "bg-zinc-800" : "bg-gray-100"}`}
                >
                  <Icons.Cpu size={16} />
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm ${isDark ? "bg-zinc-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}
                >
                  思考中...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div
            className={`p-4 border-t ${isDark ? "border-zinc-800" : "border-gray-200"}`}
          >
            <div
              className={`relative rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息，按 Enter 发送..."
                className={`w-full p-3 pr-12 text-sm bg-transparent resize-none outline-none ${
                  isDark
                    ? "text-white placeholder-gray-500"
                    : "text-gray-900 placeholder-gray-400"
                }`}
                rows={2}
              />
              <button
                title="发送消息"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`absolute right-2 bottom-2 p-2 rounded-lg transition-colors ${
                  input.trim() && !loading
                    ? isDark
                      ? "bg-yellow-500 hover:bg-yellow-400 text-white"
                      : "bg-yellow-500 hover:bg-yellow-400 text-white"
                    : isDark
                      ? "bg-zinc-800 text-gray-500"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                <Icons.ArrowUpDown size={16} className="rotate-90" />
              </button>
            </div>
            <div
              className={`flex items-center justify-between mt-2 text-xs ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{allModels.find((m) => m.id === selectedModel)?.name}</span>
                {!hasApiKey && <span className="text-yellow-500">⚠️</span>}
              </div>
              <div className="flex items-center gap-1">
                <Icons.Cpu size={12} />
                <span>{hasApiKey ? "已配置" : "未配置"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
