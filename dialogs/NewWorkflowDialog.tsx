import React from "react";
import { Icons } from "../components/Icons";

interface NewWorkflowDialogProps {
  isOpen: boolean;
  isDark: boolean;
  onCancel: () => void;
  onConfirm: (shouldSave: boolean) => void;
}

export const NewWorkflowDialog: React.FC<NewWorkflowDialogProps> = ({
  isOpen,
  isDark,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className={`w-[400px] p-6 rounded-2xl shadow-2xl border flex flex-col gap-4 transform transition-all scale-100 ${
          isDark
            ? "bg-[#1A1D21] border-zinc-700 text-gray-200"
            : "bg-white border-gray-200 text-gray-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Icons.FilePlus size={20} className="text-yellow-500" />
            新建工作流
          </h3>
          <p
            className={`text-xs mt-2 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            是否在创建新工作流之前保存当前工作流？
            <br />
            任何未保存的更改将永久丢失。
          </p>
        </div>
        <div
          className={`flex justify-end gap-2 mt-2 pt-4 border-t ${isDark ? "border-zinc-800" : "border-gray-100"}`}
        >
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              isDark
                ? "hover:bg-zinc-800 text-gray-400"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(false)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              isDark
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
            }`}
          >
            不保存
          </button>
          <button
            onClick={() => onConfirm(true)}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors shadow-lg shadow-yellow-500/20 flex items-center gap-1.5 ${
              isDark
                ? "bg-yellow-600 hover:bg-yellow-500"
                : "bg-yellow-500 hover:bg-yellow-400"
            }`}
          >
            <Icons.Save size={14} />
            保存并新建
          </button>
        </div>
      </div>
    </div>
  );
};
