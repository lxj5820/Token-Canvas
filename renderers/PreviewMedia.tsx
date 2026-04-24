import React from 'react';
import { Icons } from '../components/Icons';

interface PreviewMediaProps {
  previewMedia: { url: string; type: 'image' | 'video' } | null;
  onClose: () => void;
}

export const PreviewMedia: React.FC<PreviewMediaProps> = ({ previewMedia, onClose }) => {
  if (!previewMedia) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] bg-black rounded-lg shadow-2xl overflow-hidden border border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="关闭预览"
          className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors z-10"
          onClick={onClose}
        >
          <Icons.X size={20} />
        </button>
        {previewMedia.type === 'video' ? (
          <video
            src={previewMedia.url}
            controls
            autoPlay
            className="max-w-full max-h-[90vh]"
          />
        ) : (
          <img
            src={previewMedia.url}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain"
          />
        )}
      </div>
    </div>
  );
};
