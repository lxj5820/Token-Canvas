import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  isDark?: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 1000,
  isDark = false,
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    const iconClass = type === "success" 
      ? (isDark ? "text-emerald-400" : "text-emerald-500")
      : type === "error"
      ? (isDark ? "text-red-400" : "text-red-500")
      : (isDark ? "text-blue-400" : "text-blue-500");
    
    switch (type) {
      case "success":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case "error":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case "info":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={iconClass}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-xl shadow-xl
        animate-in slide-in-from-top-2 fade-in duration-200
        ${isDark 
          ? "bg-[#18181b]/95 border-zinc-800" 
          : "bg-white/95 border-gray-200"
        }
      `}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <span
        className={`text-sm font-medium ${
          isDark ? "text-gray-200" : "text-gray-700"
        }`}
      >
        {message}
      </span>
      <button
        onClick={onClose}
        className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
          isDark 
            ? "text-gray-500 hover:text-gray-300 hover:bg-white/5" 
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type: "success" | "error" | "info";
  }>;
  isDark?: boolean;
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  isDark = false,
  onRemove,
}) => {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => onRemove(toast.id)}
          isDark={isDark}
        />
      ))}
    </div>
  );
};
