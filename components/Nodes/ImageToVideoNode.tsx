
// 导入 React 及相关 hooks
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// 导入节点数据类型定义
import { NodeData } from '../../types';
// 导入图标组件
import { Icons } from '../Icons';
// 导入模型配置相关函数
import { getModelConfig, MODEL_REGISTRY, getVisibleModels } from '../../services/geminiService';
// 导入视频处理器配置
import { VIDEO_HANDLERS } from '../../services/mode/video/configurations';
// 导入视频约束和自动校正设置函数
import { getVideoConstraints, getAutoCorrectedVideoSettings } from '../../services/mode/video/rules';
// 导入本地节点组件
import { LocalEditableTitle, LocalCustomDropdown, LocalInputThumbnails, LocalMediaStack } from './Shared/LocalNodeComponents';

// 图生视频节点组件属性接口
export interface ImageToVideoNodeProps {
  // 节点数据
  data: NodeData;
  // 更新节点数据的函数
  updateData: (id: string, updates: Partial<NodeData>) => void;
  // 生成视频的函数
  onGenerate: (id: string) => void;
  // 是否被选中
  selected?: boolean;
  // 是否显示控制界面
  showControls?: boolean;
  // 输入图片路径数组
  inputs?: string[];
  // 最大化节点的函数
  onMaximize?: (id: string) => void;
  // 下载视频的函数
  onDownload?: (id: string) => void;
  // 是否为暗黑模式
  isDark?: boolean;
  // 是否正在选择中
  isSelecting?: boolean;
}

// 图生视频节点组件
export const ImageToVideoNode: React.FC<ImageToVideoNodeProps> = ({
    data, updateData, onGenerate, selected, showControls, inputs = [], onMaximize, onDownload, isDark = true, isSelecting
}) => {
    // 状态管理
    // 当前激活的下拉菜单
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    // 延迟显示输入图片的标志
    const [deferredInputs, setDeferredInputs] = useState(false);
    // 生成进度
    const [progress, setProgress] = useState(0);
    // 模型是否配置（是否有API Key）
    const [isConfigured, setIsConfigured] = useState(true);
    // 视频模型列表
    const [videoModels, setVideoModels] = useState<string[]>([]);

    // 计算属性
    // 节点是否被选中且稳定（不在选择过程中）
    const isSelectedAndStable = selected && !isSelecting;
    // 是否有输入图片
    const hasInputImage = inputs.length > 0;

    // 检查模型配置
    const checkConfig = useCallback(() => {
         const mName = data.model || 'Sora 2';
         const cfg = getModelConfig(mName);
         setIsConfigured(!!cfg.key);
    }, [data.model]);

    // 更新视频模型列表
    const updateModels = useCallback(() => {
        const visibleModels = getVisibleModels();
        const models = visibleModels.filter(k => MODEL_REGISTRY[k]?.category === 'VIDEO');
        setVideoModels(models);
    }, []);

    // 组件初始化和事件监听
    useEffect(() => { 
        // 检查配置和更新模型列表
        checkConfig(); 
        updateModels();
        // 监听模型配置和注册表更新事件
        window.addEventListener('modelConfigUpdated', checkConfig); 
        window.addEventListener('modelRegistryUpdated', updateModels);
        // 清理事件监听器
        return () => {
            window.removeEventListener('modelConfigUpdated', checkConfig);
            window.removeEventListener('modelRegistryUpdated', updateModels);
        };
    }, [checkConfig, updateModels]);

    // 为下拉菜单分组视频模型
    const groupedVideoModels = useMemo(() => {
        const groups: Record<string, string[]> = {
            'Kling': [], // 可灵模型组
            'Hailuo': [], // 海螺模型组
            'Veo': [], // Veo模型组
            'Wan': [] // Wan模型组
        };
        const ungrouped: string[] = []; // 未分组的模型
        
        // 遍历视频模型，按名称分类到不同组
        videoModels.forEach(m => {
            const lower = m.toLowerCase();
            if (m.startsWith('Kling') || m.includes('可灵')) {
                 groups['Kling'].push(m);
            } else if (m.startsWith('海螺') || lower.includes('hailuo')) {
                 groups['Hailuo'].push(m);
            } else if (m.startsWith('Veo')) {
                 groups['Veo'].push(m);
            } else if (m.startsWith('Wan') || lower.includes('wan')) {
                 groups['Wan'].push(m);
            } else {
                 ungrouped.push(m);
            }
        });
        
        // 过滤出有模型的组，并转换为下拉菜单需要的格式
        const result = Object.entries(groups)
            .filter(([_, items]) => items.length > 0)
            .map(([label, items]) => ({ label, items }));
            
        // 返回分组后的模型和未分组的模型
        return [...result, ...ungrouped];
    }, [videoModels]);

    // 处理节点选中和控制显示的逻辑
    useEffect(() => {
        if (isSelectedAndStable && showControls) {
            // 延迟100ms显示输入图片，避免界面闪烁
            const t = setTimeout(() => setDeferredInputs(true), 100);
            return () => clearTimeout(t);
        } else {
            setDeferredInputs(false);
        }
    }, [isSelectedAndStable, showControls]);

    // 处理生成进度的逻辑
    useEffect(() => {
        let interval: any;
        if (data.isLoading) {
            setProgress(0);
            // 每200ms更新一次进度，模拟生成过程
            interval = setInterval(() => {
                setProgress(prev => (prev >= 95 ? 95 : prev + Math.max(0.5, (95 - prev) / 20)));
            }, 200);
        } else {
            setProgress(0);
        }
        return () => clearInterval(interval);
    }, [data.isLoading]);

    const handleRatioChange = (ratio: string) => {
        const currentShort = Math.min(data.width, data.height);
        const baseSize = Math.max(currentShort, 400);

        const sizeRatio = ratio === 'auto' ? '1:1' : ratio;
        const [wStr, hStr] = sizeRatio.split(':');
        const wR = parseFloat(wStr);
        const hR = parseFloat(hStr);
        const r = wR / hR;

        let newW, newH;
        if (r >= 1) {
            newH = baseSize;
            newW = baseSize * r;
        } else {
            newW = baseSize;
            newH = baseSize / r;
        }
        updateData(data.id, { aspectRatio: ratio, width: Math.round(newW), height: Math.round(newH) });
    };

    // 获取当前模型和处理器
    const currentModel = data.model || 'Sora 2';
    const handler = VIDEO_HANDLERS[currentModel] || VIDEO_HANDLERS['Sora 2'];
    const rules = handler.rules;

    // 获取视频设置选项
    const resOptions = rules.resolutions || ['720p']; // 分辨率选项
    const durOptions = rules.durations || ['5s']; // 时长选项
    const ratioOptions = rules.ratios || ['16:9']; // 宽高比选项
    const canOptimize = !!rules.hasPromptExtend; // 是否支持提示词优化

    // 视频约束和自动校正
    const constraints = getVideoConstraints(currentModel, data.resolution, data.duration, inputs.length);
    // 特殊处理海螺模型的分辨率显示
    const displayResValue = (data.model?.includes('海螺') && (data.resolution === '720p' || data.resolution === '768p')) ? '768p' : data.resolution;

    // 自动校正视频设置
    useEffect(() => {
        let updates: Partial<NodeData> = {};
        // 获取自动校正的设置
        const corrections = getAutoCorrectedVideoSettings(currentModel, data.resolution, data.duration, inputs.length);
        if (corrections.resolution) updates.resolution = corrections.resolution;
        if (corrections.duration) updates.duration = corrections.duration;

        // 确保设置值在有效范围内
        if (data.resolution && !resOptions.includes(data.resolution)) updates.resolution = resOptions[0];
        if (data.duration && !durOptions.includes(data.duration)) updates.duration = durOptions[0];
        if (data.aspectRatio && !ratioOptions.includes(data.aspectRatio)) updates.aspectRatio = ratioOptions[0];

        // 如果有需要更新的设置，执行更新
        if (Object.keys(updates).length > 0) updateData(data.id, updates);
    }, [data.model, data.resolution, data.duration, data.aspectRatio, resOptions, durOptions, ratioOptions, currentModel, inputs.length, updateData, data.id]);

    // 样式定义
    const containerBg = isDark ? 'bg-[#1e1e1e]' : 'bg-white'; // 容器背景
    const containerBorder = selected
        ? 'border-yellow-400/80 node-selected-glow' // 选中状态的边框
        : (isDark ? 'border-zinc-800' : 'border-gray-200'); // 未选中状态的边框
    const overlayToolbarBg = isDark ? 'bg-black/50 border-white/5 text-gray-400' : 'bg-white/50 border-black/5 text-gray-600'; // 顶部工具栏背景
    const controlPanelBg = isDark ? 'bg-[#1e1e1e] border-zinc-700/80' : 'bg-white border-gray-200'; // 控制面板背景
    const inputBg = isDark ? 'bg-zinc-900/50 hover:bg-zinc-900 border-transparent focus:border-orange-500/50 text-zinc-200 placeholder-zinc-500' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 focus:border-orange-400 text-gray-900 placeholder-gray-400'; // 输入框背景
    const dividerColor = isDark ? 'bg-zinc-800' : 'bg-gray-200'; // 分隔线颜色
    const emptyStateIconColor = isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600' : 'bg-gray-100 border-gray-200 text-gray-400'; // 空状态图标颜色
    const emptyStateTextColor = isDark ? 'text-zinc-500' : 'text-gray-400'; // 空状态文字颜色
    const warningColor = isDark ? 'text-amber-400' : 'text-amber-600'; // 警告颜色
    const hasResult = !!data.videoSrc && !data.isLoading; // 是否有生成结果

    // 组件渲染
    return (
      <>
        {/* 顶部工具栏 */}
        <div className="absolute bottom-full left-0 w-full mb-2 flex items-center justify-between pointer-events-auto">
           {/* 节点标题编辑 */}
           <div className="flex items-center gap-2 pl-1">
               <LocalEditableTitle title={data.title} onUpdate={(t) => updateData(data.id, { title: t })} isDark={isDark} />
           </div>
           {/* 操作按钮 */}
           <div className={`flex gap-1 backdrop-blur-md rounded-lg p-1 border ${overlayToolbarBg}`}>
               <button 
                   title="最大化" 
                   className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-zinc-800 hover:text-white' : 'hover:bg-gray-200 hover:text-black'}`} 
                   onClick={(e) => { e.stopPropagation(); onMaximize?.(data.id); }}
               >
                   <Icons.Maximize2 size={12} />
               </button>
               <button 
                   title="下载" 
                   className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-zinc-800 hover:text-white' : 'hover:bg-gray-200 hover:text-black'}`} 
                   onClick={(e) => { e.stopPropagation(); onDownload?.(data.id); }}
               >
                   <Icons.Download size={12} />
               </button>
           </div>
        </div>
        
        {/* 主容器 */}
        <div className={`w-full h-full relative rounded-xl border ${containerBorder} ${containerBg} ${data.isStackOpen ? 'overflow-visible' : 'overflow-hidden'} shadow-lg group`}>
            {/* 生成结果显示 */}
            {hasResult ? (
                 <LocalMediaStack 
                     data={data} 
                     updateData={updateData} 
                     currentSrc={data.videoSrc} 
                     onMaximize={onMaximize} 
                     isDark={isDark} 
                     selected={selected} 
                 />
            ) : (
                {/* 空状态显示 */}
                <div className={`w-full h-full flex flex-col items-center justify-center ${emptyStateTextColor} grid-pattern`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 border ${emptyStateIconColor}`}>
                        <Icons.Clapperboard size={20} className="opacity-50"/>
                    </div>
                    <span className="text-[11px] font-medium tracking-wide opacity-60">图生视频</span>
                    {/* 无输入图片警告 */}
                    {!hasInputImage && (
                        <span className={`text-[10px] mt-2 flex items-center gap-1 ${warningColor}`}>
                            <Icons.AlertCircle size={10} />
                            需要连接输入图片
                        </span>
                    )}
                </div>
            )}
            {/* 加载状态 */}
            {data.isLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <Icons.Loader2 size={24} className="text-orange-500 animate-spin" />
                </div>
            )}
        </div>

        {/* 控制面板 */}
        {isSelectedAndStable && showControls && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-full min-w-[450px] pt-3 z-[70] pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
               {/* 输入图片缩略图 */}
               {inputs.length > 0 && <LocalInputThumbnails inputs={inputs} ready={deferredInputs} isDark={isDark} label="参考图" />}
               {/* 无输入图片提示 */}
               {!hasInputImage && (
                   <div className={`mb-2 px-3 py-2 rounded-lg border flex items-center gap-2 text-[10px] ${isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                       <Icons.AlertCircle size={12} />
                       <span>请先连接一个图片节点作为参考图</span>
                   </div>
               )}
              <div className={`${controlPanelBg} rounded-2xl p-3 shadow-2xl flex flex-col gap-3 border`}>
                  {/* 提示词输入框 */}
                  <textarea 
                      className={`w-full border rounded-xl p-3 text-[11px] leading-relaxed resize-none focus:outline-none min-h-[70px] no-scrollbar ${inputBg}`} 
                      placeholder="描述视频运动效果..." 
                      value={data.prompt || ''} 
                      onChange={(e) => updateData(data.id, { prompt: e.target.value })} 
                      onWheel={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center justify-between gap-2 h-7">
                       {/* 模型选择 */}
                       <LocalCustomDropdown 
                           options={groupedVideoModels} 
                           value={data.model || 'Sora 2'} 
                           onChange={(val: any) => updateData(data.id, { model: val })} 
                           isOpen={activeDropdown === 'model'} 
                           onToggle={() => setActiveDropdown(activeDropdown === 'model' ? null : 'model')} 
                           onClose={() => setActiveDropdown(null)} 
                           align="left" 
                           width="w-[130px]" 
                           isDark={isDark} 
                       />
                       <div className={`w-px h-3 ${dividerColor}`}></div>
                       <div className="flex items-center gap-1">
                          {/* 宽高比选择 */}
                          <LocalCustomDropdown 
                              icon={Icons.Crop} 
                              options={ratioOptions} 
                              value={data.aspectRatio || '16:9'} 
                              onChange={handleRatioChange} 
                              isOpen={activeDropdown === 'ratio'} 
                              onToggle={() => setActiveDropdown(activeDropdown === 'ratio' ? null : 'ratio')} 
                              onClose={() => setActiveDropdown(null)} 
                              disabledOptions={constraints.disabledRatios} 
                              isDark={isDark} 
                          />
                          {/* 分辨率选择 */}
                          <LocalCustomDropdown 
                              icon={Icons.Monitor} 
                              options={resOptions} 
                              value={displayResValue || '720p'} 
                              onChange={(val: any) => updateData(data.id, { resolution: val })} 
                              isOpen={activeDropdown === 'res'} 
                              onToggle={() => setActiveDropdown(activeDropdown === 'res' ? null : 'res')} 
                              onClose={() => setActiveDropdown(null)} 
                              disabledOptions={constraints.disabledRes} 
                              isDark={isDark} 
                          />
                          {/* 时长选择 */}
                          <LocalCustomDropdown 
                              icon={Icons.Clock} 
                              options={durOptions} 
                              value={data.duration || '5s'} 
                              onChange={(val: any) => updateData(data.id, { duration: val })} 
                              isOpen={activeDropdown === 'duration'} 
                              onToggle={() => setActiveDropdown(activeDropdown === 'duration' ? null : 'duration')} 
                              onClose={() => setActiveDropdown(null)} 
                              disabledOptions={constraints.disabledDurations} 
                              isDark={isDark} 
                          />
                          {/* 生成数量选择 */}
                          <LocalCustomDropdown 
                              icon={Icons.Layers} 
                              options={[1, 2, 3, 4]} 
                              value={data.count || 1} 
                              onChange={(val: any) => updateData(data.id, { count: val })} 
                              isOpen={activeDropdown === 'count'} 
                              onToggle={() => setActiveDropdown(activeDropdown === 'count' ? null : 'count')} 
                              onClose={() => setActiveDropdown(null)} 
                              isDark={isDark} 
                          />
                          
                          {/* 提示词优化按钮 */}
                          <button 
                              className={`h-full px-2 rounded flex items-center justify-center transition-colors ${canOptimize ? (data.promptOptimize ? (isDark ? 'text-orange-400 bg-orange-500/10' : 'text-orange-600 bg-orange-50') : (isDark ? 'text-zinc-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')) : (isDark ? 'text-zinc-700 opacity-50 cursor-not-allowed' : 'text-gray-200 opacity-50 cursor-not-allowed')}`} 
                              onClick={() => canOptimize && updateData(data.id, { promptOptimize: !data.promptOptimize })}
                              title={canOptimize ? `提示词优化: ${data.promptOptimize ? '开启' : '关闭'}` : '不支持提示词优化'}
                              disabled={!canOptimize}
                          >
                              <Icons.Sparkles size={13} fill={data.promptOptimize && canOptimize ? "currentColor" : "none"} />
                          </button>
                       </div>
                       {/* 生成按钮 */}
                       <button 
                           onClick={() => onGenerate(data.id)} 
                           className={`ml-auto relative h-7 px-4 text-[11px] font-bold rounded-full flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98] overflow-hidden min-w-[90px] ${data.isLoading || !isConfigured || !hasInputImage ? 'opacity-50 cursor-not-allowed bg-zinc-600 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-500/20'}`} 
                           disabled={data.isLoading || !isConfigured || !hasInputImage} 
                           title={!isConfigured ? '请在设置中配置API Key' : !hasInputImage ? '需要连接输入图片' : '生成'}
                       >
                          {/* 进度条 */}
                          {data.isLoading && (
                              <div className="absolute left-0 top-0 h-full bg-orange-500/30 z-0 transition-all duration-300 ease-linear" style={{ width: `${progress}%` }}>
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-[200%] animate-[shimmer_2s_infinite]"></div>
                              </div>
                          )}
                          {/* 按钮内容 */}
                          <div className="relative z-10 flex items-center gap-1.5">
                              {data.isLoading ? (
                                  <span className="tabular-nums">{Math.floor(progress)}%</span>
                              ) : (
                                  <>
                                      <Icons.Wand2 size={12} />
                                      <span>生成</span>
                                  </>
                              )}
                          </div>
                      </button>
                  </div>
              </div>
          </div>
        )}
      </>
    );
};
