import React from "react";
import { Icons } from "../Icons";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

// 欢迎弹窗是否显示过
const WELCOME_SHOWN_KEY = "WELCOME_MODAL_SHOWN_V1";

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
  if (!isOpen) return null;

  const handleClose = () => {
    markWelcomeShown();
    onClose();
  };

  const bgCard = isDark ? "bg-[#18181B]" : "bg-white";
  const borderColor = isDark ? "border-[#27272a]" : "border-gray-200";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border ${bgCard} ${borderColor} animate-in zoom-in-95 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className={`px-6 py-5 border-b ${borderColor} text-center`}>
          <div
            className={`w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center ${isDark ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20" : "bg-gradient-to-br from-yellow-100 to-orange-100"}`}
          >
            <Icons.Coins
              size={32}
              className={isDark ? "text-yellow-400" : "text-yellow-600"}
            />
          </div>
          <h2 className={`text-xl font-bold ${textMain}`}>
            欢迎使用词元 AI 画布🪙
          </h2>
          <p className={`text-sm mt-1 ${textSub}`}>你的 AI 创意工具箱</p>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-4">
          {/* 警告区域 */}
          <div
            className={`p-4 rounded-xl border ${isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}
          >
            <div className="flex items-start gap-3">
              <Icons.AlertTriangle
                size={20}
                className={
                  isDark
                    ? "text-amber-400 shrink-0 mt-0.5"
                    : "text-amber-600 shrink-0 mt-0.5"
                }
              />
              <div>
                <h4
                  className={`text-sm font-bold ${isDark ? "text-amber-400" : "text-amber-700"}`}
                >
                  郑重提醒
                </h4>
                <p
                  className={`text-xs mt-1 leading-relaxed ${isDark ? "text-amber-300/80" : "text-amber-600"}`}
                >
                  自接 API 平台存在风险！很多小型 API 中转商可能会
                  <strong>跑路</strong>，充值后血本无归。
                  如果你的出图/出视频量较大，强烈建议使用正规大厂服务。
                </p>
              </div>
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
                  词元 AI
                  画布为完全免费开源项目，仅供学习交流使用。使用过程中产生的任何内容均由用户自行负责，与本平台无关。
                </p>
              </div>
            </div>
          </div>

          {/* 接口兼容性提示 */}
          <div
            className={`p-3 rounded-lg ${isDark ? "bg-white/5" : "bg-gray-50"}`}
          >
            <div className="flex items-start gap-2">
              <Icons.Info size={14} className={`${textSub} shrink-0 mt-0.5`} />
              <p className={`text-[11px] leading-relaxed ${textSub}`}>
                <strong>关于接口兼容性：</strong>
                不同 API 中转商的接口参数可能不同，本项目无法做到统一适配。
                如遇不兼容，请参考 README 或使用 AI 编辑器自行调整代码。
              </p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div
          className={`px-6 py-4 border-t ${borderColor} flex justify-center`}
        >
          <button
            onClick={handleClose}
            className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/25 transition-all active:scale-[0.98]"
          >
            我已了解，开始使用
          </button>
        </div>
      </div>
    </div>
  );
};
