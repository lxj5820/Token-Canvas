import React from 'react';
import { Icons } from '../../Icons';
import { safeDownload } from './LocalNodeComponents';

interface ImageNodeToolbarProps {
  imageSrc?: string;
  nodeId?: string;
  onMaximize?: (id: string) => void;
  isDark?: boolean;
}

export const ImageNodeToolbar: React.FC<ImageNodeToolbarProps> = ({
    imageSrc,
    nodeId,
    onMaximize,
    isDark = true
}) => {
    const controlPanelBg = isDark ? 'bg-[#1a1a1a]/95 backdrop-blur-xl border-zinc-700/50' : 'bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl';
    
    const buttonBaseClass = isDark 
        ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' 
        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100';

    const handleDownload = () => {
        if (imageSrc) {
            safeDownload(imageSrc);
        }
    };

    const handlePreview = () => {
        if (nodeId) {
            onMaximize?.(nodeId);
        }
    };

    return (
        <div className={`${controlPanelBg} rounded-xl p-2 flex items-center gap-2 border`}>
            {/* 全景 */}
            <button 
                className={`${buttonBaseClass} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                title="全景"
            >
                <Icons.LayoutGrid size={14} />
                <span className="text-xs whitespace-nowrap">全景</span>
                <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
            </button>
            
            {/* 多角度 */}
            <button 
                className={`${buttonBaseClass} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                title="多角度"
            >
                <Icons.RotateCcw size={14} />
                <span className="text-xs whitespace-nowrap">多角度</span>
                <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
            </button>
            
            {/* 打光 */}
            <button 
                className={`${buttonBaseClass} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                title="打光"
            >
                <Icons.Sun size={14} />
                <span className="text-xs whitespace-nowrap">打光</span>
                <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
            </button>
            
            {/* 分隔线 */}
            <div className={`${isDark ? 'bg-zinc-600' : 'bg-gray-300'} h-5 w-px`} aria-hidden="true"></div>
            
            {/* 九宫格 */}
            <button 
                className={`${buttonBaseClass} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                title="九宫格"
            >
                <Icons.LayoutGrid size={14} />
                <span className="text-xs whitespace-nowrap">九宫格</span>
                <Icons.ChevronDown size={12} className="opacity-70" />
                <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
            </button>
            
            {/* 高清 */}
            <button 
                className={`${buttonBaseClass} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                title="高清"
            >
                <Icons.ZoomIn size={14} />
                <span className="text-xs whitespace-nowrap">高清</span>
                <Icons.ChevronDown size={12} className="opacity-70" />
                <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
            </button>
            
            {/* 宫格切分 */}
            <button 
                className={`${buttonBaseClass} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                title="宫格切分"
            >
                <Icons.Images size={14} />
                <span className="text-xs whitespace-nowrap">宫格切分</span>
                <Icons.ChevronDown size={12} className="opacity-70" />
                <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
            </button>
            
            {/* 分隔线 */}
            <div className={`${isDark ? 'bg-zinc-600' : 'bg-gray-300'} h-5 w-px`} aria-hidden="true"></div>
            
            {/* 标注 */}
            <button 
                className={`${buttonBaseClass} h-8 w-8 rounded-lg flex items-center justify-center transition-colors`}
                title="标注"
            >
                <Icons.Edit3 size={14} />
            </button>

            {/* 下载 */}
            <button 
                className={`${buttonBaseClass} h-8 w-8 rounded-lg flex items-center justify-center transition-colors`}
                title="下载"
                onClick={handleDownload}
            >
                <Icons.Download size={14} />
            </button>
            
            {/* 预览 */}
            <button 
                className={`${buttonBaseClass} h-8 w-8 rounded-lg flex items-center justify-center transition-colors`}
                title="预览"
                onClick={handlePreview}
            >
                <Icons.Maximize2 size={14} />
            </button>
        </div>
    );
};