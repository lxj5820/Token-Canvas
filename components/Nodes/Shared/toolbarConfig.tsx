import React from "react";
import { Icons } from "../../Icons";

export interface ToolbarButtonConfig {
  id: string;
  icon: React.ReactNode;
  title: string;
  onClick: (id: string) => void;
  visible?: (data: any) => boolean;
  className?: string;
  position?: "left" | "center" | "right";
}

export interface ToolbarConfig {
  buttons: ToolbarButtonConfig[];
  className?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
}

export const createImageNodeToolbarConfig = ({
  onMaximize,
  onDownload,
  onDelete,
  onUpload,
  isDark = true,
}: {
  onMaximize?: (id: string) => void;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpload?: (id: string) => void;
  isDark?: boolean;
}): ToolbarConfig => {
  const overlayToolbarBg = isDark
    ? "bg-black/50 border-white/5 text-gray-400"
    : "bg-white/50 border-black/5 text-gray-600";
  const buttonHoverClass = isDark
    ? "hover:bg-zinc-800 hover:text-white"
    : "hover:bg-gray-200 hover:text-black";

  const buttons: ToolbarButtonConfig[] = [];

  if (onMaximize) {
    buttons.push({
      id: "maximize",
      icon: <Icons.Maximize2 size={12} />,
      title: "Maximize",
      onClick: onMaximize,
      className: `p-1 rounded transition-colors ${buttonHoverClass}`,
      position: "right",
    });
  }

  if (onDownload) {
    buttons.push({
      id: "download",
      icon: <Icons.Download size={12} />,
      title: "Download",
      onClick: onDownload,
      className: `p-1 rounded transition-colors ${buttonHoverClass}`,
      position: "right",
    });
  }

  if (onDelete) {
    buttons.push({
      id: "delete",
      icon: <Icons.Trash2 size={12} />,
      title: "Delete",
      onClick: onDelete,
      className: `p-1 rounded transition-colors text-red-400 ${isDark ? "hover:bg-zinc-800" : "hover:bg-gray-200"}`,
      position: "right",
    });
  }

  return {
    buttons,
    className: `flex gap-1 backdrop-blur-md rounded-lg p-1 border ${overlayToolbarBg}`,
    backgroundColor: isDark ? "bg-black/50" : "bg-white/50",
    textColor: isDark ? "text-gray-400" : "text-gray-600",
    borderColor: isDark ? "border-white/5" : "border-black/5",
  };
};
