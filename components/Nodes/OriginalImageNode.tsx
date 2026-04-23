import React from 'react';
import { NodeData } from '../../types';
import { Icons } from '../Icons';
import { EditableTitle } from './Shared/NodeComponents';
import { MediaStack } from './Shared/MediaStack';

// 原始图片节点属性
interface OriginalImageNodeProps {
  data: NodeData;
  updateData: (id: string, updates: Partial<NodeData>) => void;
  onMaximize?: (id: string) => void;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpload?: (id: string) => void;
  isDark?: boolean;
  selected?: boolean;
}

// 原始图片节点组件
export const OriginalImageNode: React.FC<OriginalImageNodeProps> = ({
    data, updateData, onMaximize, onDownload, onDelete, onUpload, isDark = true, selected
}) => {
    const controlPanelBg = isDark ? 'bg-[#1a1a1a]/95 backdrop-blur-xl border-zinc-700/50' : 'bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl';
    const hasResult = !!(data.imageSrc || data.videoSrc);
    const containerBorder = selected
        ? 'border-yellow-400/80 node-selected-glow'
        : (isDark ? 'border-zinc-800' : 'border-gray-200');

    return (
        <>
          <div className="absolute bottom-full left-0 w-full mb-2 flex items-center justify-between pointer-events-auto">
              <EditableTitle title={data.title} onUpdate={(t) => updateData(data.id, { title: t })} isDark={isDark} />
          </div>
          
          <div className={`w-full h-full relative group rounded-xl border ${containerBorder} ${isDark ? 'bg-black' : 'bg-white'} shadow-lg ${data.isStackOpen || (hasResult && selected) ? 'overflow-visible' : 'overflow-hidden'}`}>
              {hasResult ? (
                  <MediaStack 
                      data={data} 
                      updateData={updateData} 
                      currentSrc={data.videoSrc || data.imageSrc} 
                      type={data.videoSrc ? 'video' : 'image'} 
                      onMaximize={onMaximize} 
                      isDark={isDark}
                      selected={selected}
                  />
              ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
                      <div className={`w-16 h-16 rounded-full border flex items-center justify-center cursor-pointer transition-all shadow-lg group/icon ${isDark ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} hover:text-yellow-400 hover:border-yellow-500/50`} onClick={(e) => { e.stopPropagation(); if (onUpload) onUpload(data.id); }}>
                          <Icons.Upload size={28} className={`transition-colors ${isDark ? 'text-zinc-500 group-hover/icon:text-yellow-400' : 'text-gray-400 group-hover/icon:text-yellow-500'}`}/>
                      </div>
                      <span className={`text-[11px] font-medium select-none ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Click icon to Upload</span>
                  </div>
              )}
          </div>
          
          {hasResult && selected && (
              <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 -translate-y-full z-[1001] pointer-events-auto">
                  <div className={`${controlPanelBg} rounded-xl p-2 flex items-center gap-2 border`}>
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                          title="全景"
                      >
                          <Icons.LayoutGrid size={14} />
                          <span className="text-xs whitespace-nowrap">全景</span>
                          <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
                      </button>
                      
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                          title="多角度"
                      >
                          <Icons.RotateCcw size={14} />
                          <span className="text-xs whitespace-nowrap">多角度</span>
                          <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
                      </button>
                      
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                          title="打光"
                      >
                          <Icons.Sun size={14} />
                          <span className="text-xs whitespace-nowrap">打光</span>
                          <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
                      </button>
                      
                      <div className={`${isDark ? 'bg-zinc-600' : 'bg-gray-300'} h-5 w-px`} aria-hidden="true"></div>
                      
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                          title="九宫格"
                      >
                          <Icons.LayoutGrid size={14} />
                          <span className="text-xs whitespace-nowrap">九宫格</span>
                          <Icons.ChevronDown size={12} className="opacity-70" />
                          <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
                      </button>
                      
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                          title="高清"
                      >
                          <Icons.ZoomIn size={14} />
                          <span className="text-xs whitespace-nowrap">高清</span>
                          <Icons.ChevronDown size={12} className="opacity-70" />
                          <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
                      </button>
                      
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 px-2 py-2 rounded-lg flex items-center gap-1 transition-colors`}
                          title="宫格切分"
                      >
                          <Icons.Images size={14} />
                          <span className="text-xs whitespace-nowrap">宫格切分</span>
                          <Icons.ChevronDown size={12} className="opacity-70" />
                          <span className="ml-1 flex h-5 w-10 items-center justify-center rounded-full bg-[#3CB5CC40] text-[10px] font-bold uppercase text-[#5DDCFF]">开发中</span>
                      </button>
                      
                      <div className={`${isDark ? 'bg-zinc-600' : 'bg-gray-300'} h-5 w-px`} aria-hidden="true"></div>
                      
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 w-8 rounded-lg flex items-center justify-center transition-colors`}
                          title="标注"
                      >
                          <Icons.Edit3 size={14} />
                      </button>
                      
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 w-8 rounded-lg flex items-center justify-center transition-colors`}
                          title="下载"
                          onClick={(e) => { e.stopPropagation(); onDownload?.(data.id); }}
                      >
                          <Icons.Download size={14} />
                      </button>
                      
                      <button 
                          className={`${isDark ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'} h-8 w-8 rounded-lg flex items-center justify-center transition-colors`}
                          title="预览"
                          onClick={(e) => { e.stopPropagation(); onMaximize?.(data.id); }}
                      >
                          <Icons.Maximize2 size={14} />
                      </button>
                  </div>
              </div>
          )}
        </>
    );
};