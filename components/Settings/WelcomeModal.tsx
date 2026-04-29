import React, { useState, useEffect } from "react";
import { Icons } from "../Icons";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

// 欢迎弹窗是否显示过
const WELCOME_SHOWN_KEY = "WELCOME_MODAL_SHOWN_V2";

// API配置存储key - 与其他组件保持一致
const GLOBAL_BASE_URL_KEY = "GLOBAL_BASE_URL";
const GLOBAL_API_KEY_KEY = "GLOBAL_API_KEY";

// 默认API地址
const DEFAULT_API_URL = "https://newapi.asia";

// 获取KEY链接
const GET_KEY_URL = "https://newapi.asia/register?channel=c_h4b2e8rd";

// 检查欢迎弹窗是否显示过
export const hasShownWelcome = (): boolean => {
  return localStorage.getItem(WELCOME_SHOWN_KEY) === "true";
};

// 标记欢迎弹窗已显示
export const markWelcomeShown = (): void => {
  localStorage.setItem(WELCOME_SHOWN_KEY, "true");
};

// 欢迎弹窗组件
export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  isDark,
}) => {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setApiUrl(localStorage.getItem(GLOBAL_BASE_URL_KEY) || DEFAULT_API_URL);
      setApiKey(localStorage.getItem(GLOBAL_API_KEY_KEY) || "");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    markWelcomeShown();
    onClose();
  };

  const handleEnterCanvas = () => {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      setError("请输入 API Key");
      return;
    }

    const finalApiUrl = apiUrl.trim() || DEFAULT_API_URL;
    
    localStorage.setItem(GLOBAL_API_KEY_KEY, trimmedKey);
    localStorage.setItem(GLOBAL_BASE_URL_KEY, finalApiUrl);
    
    window.dispatchEvent(
      new CustomEvent("modelConfigUpdated", { detail: { modelName: "*" } })
    );

    handleClose();
  };

  const handleGetKey = () => {
    window.open(GET_KEY_URL, "_blank");
  };

  const bgCard = isDark ? "bg-[#18181B]" : "bg-white";
  const borderColor = isDark ? "border-[#27272a]" : "border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-gray-400" : "text-gray-500";
  const inputBg = isDark ? "bg-zinc-900" : "bg-gray-50";
  const inputBorder = isDark ? "border-zinc-700" : "border-gray-200";
  const inputText = isDark ? "text-white" : "text-gray-900";
  const inputPlaceholder = isDark ? "placeholder-gray-500" : "placeholder-gray-400";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div
        className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border ${bgCard} ${borderColor} animate-in zoom-in-95 duration-300`}
      >
        {/* 标题栏 */}
        <div className={`px-6 py-5 border-b ${borderColor} text-center`}>
          <div
            className={`w-16 h-16 mx-auto mb-3 rounded-2xl overflow-hidden flex items-center justify-center`}
          >
            <img
              src="https://lxj-picgo.oss-cn-chengdu.aliyuncs.com/20260425224119523.png"
              alt="Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className={`text-xl font-bold ${textMain}`}>
            欢迎使用词元 AI 画布
          </h2>
          <p className={`text-sm mt-1 ${textSub}`}>你的 AI 创意工具箱</p>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-4">
          {/* API配置区域 */}
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textMain}`}>
                API 地址
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setError("");
                }}
                placeholder={DEFAULT_API_URL}
                className={`w-full px-4 py-2.5 rounded-xl border ${inputBorder} ${inputBg} ${inputText} ${inputPlaceholder} text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all`}
              />
              <p className={`text-xs mt-1.5 ${textSub}`}>
                使用默认地址：{DEFAULT_API_URL}
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${textMain}`}>
                API Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError("");
                }}
                placeholder="请输入您的 API Key"
                className={`w-full px-4 py-2.5 rounded-xl border ${inputBorder} ${inputBg} ${inputText} ${inputPlaceholder} text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all`}
              />
              {error && (
                <p className="text-red-500 text-xs mt-1.5">{error}</p>
              )}
            </div>
          </div>

          {/* 免责声明 */}
          <div
            className={`p-4 rounded-xl border ${isDark ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"}`}
          >
            <div className="flex items-start gap-3">
              <Icons.Info
                size={20}
                className={
                  isDark
                    ? "text-yellow-400 shrink-0 mt-0.5"
                    : "text-yellow-600 shrink-0 mt-0.5"
                }
              />
              <div>
                <h4
                  className={`text-sm font-bold ${isDark ? "text-yellow-400" : "text-yellow-700"}`}
                >
                  免责声明
                </h4>
                <p
                  className={`text-xs mt-1 leading-relaxed ${isDark ? "text-yellow-300/80" : "text-yellow-600"}`}
                >
                  词元AI 画布为完全免费项目，仅供学习交流使用。使用过程中产生的任何内容均由用户自行负责，与本平台无关。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div
          className={`px-6 py-4 border-t ${borderColor} flex gap-3`}
        >
          <button
            onClick={handleEnterCanvas}
            className={`flex-1 px-6 py-2.5 rounded-xl text-sm font-medium border transition-all ${isDark ? "border-zinc-600 text-gray-300 hover:bg-white/5" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            进入画布
          </button>
          <button
            onClick={handleGetKey}
            className="flex-1 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white shadow-lg shadow-yellow-500/25 transition-all active:scale-[0.98]"
          >
            获取 Key
          </button>
        </div>
      </div>
    </div>
  );
};
