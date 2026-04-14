import React, { useState, useRef, useEffect, memo, useMemo } from 'react';
import { Icons } from './Icons';
import { NodeType, NodeData } from '../types';

interface SidebarProps {
  onAddNode: (type: NodeType) => void;
  onNewWorkflow: () => void;
  onImportAsset: () => void;
  onOpenExportImport: () => void;
  nodes: NodeData[];
  onPreviewMedia: (url: string, type: 'image' | 'video') => void;
  isDark?: boolean;
  // 新增：画布操作回调
  onScreenshot?: () => void;
  onSelectMode?: () => void;
  onPanMode?: () => void;
  onAlignVertical?: () => void;
  onAlignHorizontal?: () => void;
  currentMode?: 'select' | 'pan';
}

type ActivePanel = 'ADD' | 'HISTORY' | 'PROJECT' | 'TOOLS' | null;

const Sidebar: React.FC<SidebarProps> = ({ 
  onAddNode, 
  onNewWorkflow,
  onImportAsset,
  onOpenExportImport,
  nodes,
  onPreviewMedia,
  isDark = true,
  onScreenshot,
  onSelectMode,
  onPanMode,
  onAlignVertical,
  onAlignHorizontal,
  currentMode = 'select'
}) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [historyTab, setHistoryTab] = useState<'image' | 'video'>('image');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Deduplicate nodes for history display
  const uniqueNodes = useMemo(() => {
      const map = new Map<string, NodeData>();
      nodes.forEach(n => {
          if (!map.has(n.id)) map.set(n.id, n);
      });
      return Array.from(map.values());
  }, [nodes]);

  const imageNodes = useMemo(() => 
      uniqueNodes.filter(n => n.imageSrc && !n.isLoading), 
  [uniqueNodes]);
  
  const videoNodes = useMemo(() => 
      uniqueNodes.filter(n => n.videoSrc && !n.isLoading), 
  [uniqueNodes]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        sidebarRef.current && 
        !sidebarRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setActivePanel(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  // 样式
  const bgMain = isDark ? 'bg-[#18181b]/95' : 'bg-white/95';
  const borderColor = isDark ? 'border-zinc-800' : 'border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-gray-600' : 'text-gray-400';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100';
  const activeBg = isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600';
  const activeBgOrange = isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600';

  // 侧边栏按钮
  const SidebarButton = ({ 
    icon: Icon, 
    panel, 
    tooltip,
    shortcut,
    onClick,
    isActive = false
  }: { 
    icon: any, 
    panel?: ActivePanel, 
    tooltip: string,
    shortcut?: string,
    onClick?: () => void,
    isActive?: boolean
  }) => {
    const isBtnActive = isActive || (panel && activePanel === panel);
    
    return (
      <button 
        className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 group ${
          isBtnActive ? activeBg : `${textSub} ${hoverBg}`
        }`}
        onClick={() => {
          if (onClick) {
            onClick();
          } else if (panel) {
            togglePanel(panel);
          }
        }}
      >
        <Icon size={20} />
        <div className={`absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 ${
          isDark ? 'bg-zinc-900 text-white border border-zinc-700' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
        }`}>
          {tooltip}
          {shortcut && <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>{shortcut}</span>}
        </div>
      </button>
    );
  };

  // 模式切换按钮（特殊样式）
  const ModeButton = ({
    icon: Icon,
    tooltip,
    shortcut,
    isActive = false,
    onClick,
    color = 'blue'
  }: {
    icon: any;
    tooltip: string;
    shortcut?: string;
    isActive?: boolean;
    onClick?: () => void;
    color?: 'blue' | 'orange';
  }) => {
    const activeClass = color === 'blue' ? activeBg : activeBgOrange;
    
    return (
      <button 
        className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 group ${
          isActive ? activeClass : `${textSub} ${hoverBg}`
        }`}
        onClick={onClick}
      >
        <Icon size={20} />
        <div className={`absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 ${
          isDark ? 'bg-zinc-900 text-white border border-zinc-700' : 'bg-white text-gray-900 border border-gray-200 shadow-lg'
        }`}>
          {tooltip}
          {shortcut && <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>{shortcut}</span>}
        </div>
      </button>
    );
  };

  // 渲染工具面板
  const renderToolsPanel = () => (
    <div className="space-y-3">
      <div className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>排列工具</div>
      
      {/* 上下排列 */}
      <button
        onClick={() => { onAlignVertical?.(); setActivePanel(null); }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all group ${
          isDark 
            ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50' 
            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          <Icons.ArrowRightLeft size={18} className="rotate-90" />
        </div>
        <div className="text-left">
          <div className={`text-sm font-medium ${textMain}`}>上下排列</div>
          <div className={`text-[11px] ${textMuted}`}>选中节点垂直对齐</div>
        </div>
      </button>
      
      {/* 左右排列 */}
      <button
        onClick={() => { onAlignHorizontal?.(); setActivePanel(null); }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all group ${
          isDark 
            ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50' 
            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
          <Icons.ArrowRightLeft size={18} />
        </div>
        <div className="text-left">
          <div className={`text-sm font-medium ${textMain}`}>左右排列</div>
          <div className={`text-[11px] ${textMuted}`}>选中节点水平对齐</div>
        </div>
      </button>
    </div>
  );

  // 渲染添加节点面板
  const renderAddPanel = () => {
    const NodeButton = ({ icon: Icon, label, description, type, color }: { icon: any, label: string, description: string, type: NodeType, color: string }) => (
      <button
        onClick={() => { onAddNode(type); setActivePanel(null); }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all group ${
          isDark 
            ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50' 
            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 text-left">
          <div className={`text-sm font-semibold ${textMain}`}>{label}</div>
          <div className={`text-[11px] ${textMuted}`}>{description}</div>
        </div>
        <Icons.ChevronRight size={16} className={`${textMuted} group-hover:translate-x-0.5 transition-transform`} />
      </button>
    );

    return (
      <div className="space-y-2">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>生成节点</div>
        <div className="space-y-2">
          <NodeButton 
            icon={Icons.Image} 
            label="生图" 
            description="文本/图片生成图片"
            type={NodeType.TEXT_TO_IMAGE} 
            color={isDark ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-100 text-cyan-600'} 
          />
          <NodeButton 
            icon={Icons.Video} 
            label="生视频" 
            description="文本/图片生成视频"
            type={NodeType.TEXT_TO_VIDEO} 
            color={isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-600'} 
          />
        </div>
      </div>
    );
  };

  // 渲染项目面板
  const renderProjectPanel = () => (
    <div className="space-y-2">
      <button
        onClick={() => { onNewWorkflow(); setActivePanel(null); }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${hoverBg}`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          <Icons.FilePlus size={18} />
        </div>
        <div className="text-left">
          <div className={`text-sm font-medium ${textMain}`}>新建项目</div>
          <div className={`text-[11px] ${textMuted}`}>创建空白画布</div>
        </div>
      </button>
      
      <button
        onClick={() => { onOpenExportImport(); setActivePanel(null); }}
        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${hoverBg}`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
          <Icons.FolderOpen size={18} />
        </div>
        <div className="text-left">
          <div className={`text-sm font-medium ${textMain}`}>导出 / 导入</div>
          <div className={`text-[11px] ${textMuted}`}>项目文件管理</div>
        </div>
      </button>
    </div>
  );

  // 渲染面板内容
  const renderPanel = () => {
    if (!activePanel) return null;

    // 生成历史面板 - 独立的大面板
    if (activePanel === 'HISTORY') {
      return (
        <div 
          ref={panelRef}
          className={`fixed left-[76px] top-4 bottom-4 w-80 ${bgMain} backdrop-blur-xl border ${borderColor} rounded-2xl z-[190] flex flex-col shadow-2xl animate-in slide-in-from-left-2 duration-200`}
        >
          {/* Header */}
          <div className={`px-5 py-4 border-b ${borderColor} flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <Icons.Clock size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <h3 className={`text-base font-bold ${textMain}`}>生成历史</h3>
            </div>
            <button 
              onClick={() => setActivePanel(null)}
              className={`p-2 rounded-lg ${hoverBg} ${textSub}`}
            >
              <Icons.X size={18} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className={`px-4 pt-4 shrink-0`}>
            <div className={`flex p-1 rounded-xl ${isDark ? 'bg-zinc-900' : 'bg-gray-100'}`}>
              <button 
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  historyTab === 'image' 
                    ? (isDark ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') 
                    : textSub
                }`}
                onClick={() => setHistoryTab('image')}
              >
                <Icons.Image size={14} />
                图片 ({imageNodes.length})
              </button>
              <button 
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  historyTab === 'video' 
                    ? (isDark ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm') 
                    : textSub
                }`}
                onClick={() => setHistoryTab('video')}
              >
                <Icons.Video size={14} />
                视频 ({videoNodes.length})
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            {(historyTab === 'image' ? imageNodes : videoNodes).length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full ${textMuted}`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                  {historyTab === 'image' ? <Icons.Image size={28} className="opacity-40" /> : <Icons.Video size={28} className="opacity-40" />}
                </div>
                <p className="text-sm font-medium">暂无生成历史</p>
                <p className={`text-xs mt-1 ${textMuted}`}>生成的{historyTab === 'image' ? '图片' : '视频'}将显示在这里</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(historyTab === 'image' ? imageNodes : videoNodes).map(node => (
                  <div 
                    key={node.id} 
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group ${isDark ? 'bg-zinc-900' : 'bg-gray-100'}`}
                    onClick={() => onPreviewMedia(
                      (historyTab === 'image' ? node.imageSrc : node.videoSrc) || '', 
                      historyTab
                    )}
                  >
                    {historyTab === 'image' ? (
                      <img src={node.imageSrc!} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async"/>
                    ) : (
                      <div className="w-full h-full relative">
                        <video src={node.videoSrc!} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" muted preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/20' : 'bg-black/20'} backdrop-blur-sm`}>
                            <Icons.Play size={14} className="text-white ml-0.5"/>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className={`px-4 py-3 border-t ${borderColor} shrink-0`}>
            <div className={`flex items-center justify-between text-xs ${textMuted}`}>
              <span>共 {(historyTab === 'image' ? imageNodes : videoNodes).length} 项</span>
              <span>{historyTab === 'image' ? '图片' : '视频'}历史</span>
            </div>
          </div>
        </div>
      );
    }

    // 其他面板 - 紧凑型
    let title = '';
    let content = null;

    switch (activePanel) {
      case 'ADD':
        title = '添加节点';
        content = renderAddPanel();
        break;
      case 'PROJECT':
        title = '项目';
        content = renderProjectPanel();
        break;
      case 'TOOLS':
        title = '排列工具';
        content = renderToolsPanel();
        break;
    }

    return (
      <div 
        ref={panelRef}
        className={`fixed left-[76px] top-1/2 -translate-y-1/2 w-64 max-h-[80vh] ${bgMain} backdrop-blur-xl border ${borderColor} rounded-2xl z-[190] flex flex-col shadow-xl animate-in slide-in-from-left-2 duration-200`}
      >
        {/* Panel Header */}
        <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between shrink-0`}>
          <h3 className={`text-sm font-bold ${textMain}`}>{title}</h3>
          <button 
            onClick={() => setActivePanel(null)}
            className={`p-1.5 rounded-lg ${hoverBg} ${textSub}`}
          >
            <Icons.X size={16} />
          </button>
        </div>
        
        {/* Panel Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {content}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Sidebar - 新布局 */}
      <div 
        ref={sidebarRef}
        className={`fixed left-4 top-1/2 -translate-y-1/2 z-[200] ${bgMain} backdrop-blur-xl border ${borderColor} rounded-2xl p-2 flex flex-col items-center gap-1 shadow-xl`}
      >
        {/* 第一行：截图 */}
        <SidebarButton icon={Icons.Camera} tooltip="截图" onClick={onScreenshot} />
        
        <div className={`w-8 h-px my-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`} />
        
        {/* 第二行：选择模式 */}
        <ModeButton 
          icon={Icons.MousePointer2} 
          tooltip="选择模式" 
          shortcut="V"
          isActive={currentMode === 'select'}
          onClick={onSelectMode}
          color="blue"
        />
        
        {/* 第三行：移动模式 */}
        <ModeButton 
          icon={Icons.Hand} 
          tooltip="移动模式" 
          shortcut="H"
          isActive={currentMode === 'pan'}
          onClick={onPanMode}
          color="orange"
        />
        
        <div className={`w-8 h-px my-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`} />
        
        {/* 第四行：排列工具（展开面板） */}
        <SidebarButton icon={Icons.AlignVerticalJustify} panel="TOOLS" tooltip="排列工具" />
        
        <div className={`w-8 h-px my-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`} />
        
        {/* 第五行：添加节点 */}
        <SidebarButton icon={Icons.Plus} panel="ADD" tooltip="添加节点" />
        
        {/* 第六行：生成历史 */}
        <SidebarButton icon={Icons.History} panel="HISTORY" tooltip="生成历史" />
        
        <div className={`w-8 h-px my-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`} />
        
        {/* 第七行：项目 */}
        <SidebarButton icon={Icons.Folder} panel="PROJECT" tooltip="项目" />
      </div>

      {/* Panel */}
      {renderPanel()}
    </>
  );
};

export default Sidebar;
