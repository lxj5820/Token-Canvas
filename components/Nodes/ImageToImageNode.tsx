
// 导入 React 及相关 hooks
import React, { useState, useEffect, useCallback } from 'react';
// 导入节点数据类型定义
import { NodeData } from '../../types';
// 导入图标组件
import { Icons } from '../Icons';
// 导入模型配置相关函数
import { getModelConfig, MODEL_REGISTRY, getVisibleModels, MODEL_NAME_MIGRATION } from '../../services/geminiService';
// 导入图片处理器配置
import { IMAGE_HANDLERS } from '../../services/mode/image/configurations';
// 导入本地节点组件
import { LocalEditableTitle, LocalCustomDropdown, LocalInputThumbnails, LocalMediaStack } from './Shared/LocalNodeComponents';

// 图生图节点组件属性接口
export interface ImageToImageNodeProps {
  // 节点数据
  data: NodeData;
  // 更新节点数据的函数
  updateData: (id: string, updates: Partial<NodeData>) => void;
  // 生成图片的函数
  onGenerate: (id: string) => void;
  // 是否被选中
  selected?: boolean;
  // 是否显示控制界面
  showControls?: boolean;
  // 输入图片路径数组
  inputs?: string[];
  // 最大化节点的函数
  onMaximize?: (id: string) => void;
  // 下载图片的函数
  onDownload?: (id: string) => void;
  // 是否为暗黑模式
  isDark?: boolean;
  // 是否正在选择中
  isSelecting?: boolean;
}

// 图生图节点组件
export const ImageToImageNode: React.FC<ImageToImageNodeProps> = ({
    data, updateData, onGenerate, selected, showControls, inputs = [], onMaximize, onDownload, isDark = true, isSelecting
}) => {
    // 状态管理
    // 当前激活的下拉菜单
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    // 延迟显示输入图片的标志
    const [deferredInputs, setDeferredInputs] = useState(false);
    // 模型是否配置（是否有API Key）
    const [isConfigured, setIsConfigured] = useState(true);
    // 图片模型列表
    const [imageModels, setImageModels] = useState<string[]>([]);

    // 计算属性
    // 节点是否被选中且稳定（不在选择过程中）
    const isSelectedAndStable = selected && !isSelecting;
    // 是否有输入图片
    const hasInputImage = inputs.length > 0;

    // 检查模型配置
    const checkConfig = useCallback(() => {
         const mName = data.model || 'Banana 2';
         const cfg = getModelConfig(mName);
         setIsConfigured(!!cfg.key);
    }, [data.model]);

    // 更新图片模型列表
    const updateModels = useCallback(() => {
        const visibleModels = getVisibleModels();
        const models = visibleModels.filter(k => MODEL_REGISTRY[k]?.category === 'IMAGE');
        setImageModels(models);
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

    // 获取当前模型和规则
    const currentModel =
      MODEL_NAME_MIGRATION[data.model] || data.model || 'Banana 2';
    const handler = IMAGE_HANDLERS[currentModel] || IMAGE_HANDLERS['Banana 2'];
    const rules = handler.rules;
    const supportedResolutions = rules.resolutions || ['1k']; // 支持的分辨率
    const supportedRatios = rules.ratios || ['1:1', '16:9']; // 支持的宽高比
    const canOptimize = !!rules.hasPromptExtend; // 是否支持提示词优化

    // 处理宽高比变化的函数
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

    // 是否有生成结果
    const hasResult = !!data.imageSrc && !data.isLoading;
    
    // 自动校正设置
    useEffect(() => { 
        // 确保宽高比在支持范围内
        if (data.aspectRatio && !supportedRatios.includes(data.aspectRatio)) {
            updateData(data.id, { aspectRatio: '1:1' });
        }
        // 确保分辨率在支持范围内
        if (data.resolution && !supportedResolutions.includes(data.resolution)) {
            updateData(data.id, { resolution: supportedResolutions[0] });
        }
    }, [data.model, data.aspectRatio, data.resolution, data.id, updateData, supportedRatios, supportedResolutions]);

    // 样式定义
    const containerBg = isDark ? 'bg-[#1e1e1e]' : 'bg-white'; // 容器背景
    const containerBorder = selected
        ? 'border-yellow-400 node-selected-glow' // 选中状态的边框
        : (isDark ? 'border-zinc-800' : 'border-gray-200'); // 未选中状态的边框
    const overlayToolbarBg = isDark ? 'bg-black/50 border-white/5 text-gray-400' : 'bg-white/50 border-black/5 text-gray-600'; // 顶部工具栏背景
    const controlPanelBg = isDark ? 'bg-[#1e1e1e] border-zinc-700/80' : 'bg-white border-gray-200'; // 控制面板背景
    const inputBg = isDark ? 'bg-zinc-900/50 hover:bg-zinc-900 border-transparent focus:border-yellow-500/50 text-zinc-200 placeholder-zinc-500' : 'bg-gray-50 hover:bg-gray-100 border-gray-200 focus:border-purple-400 text-gray-900 placeholder-gray-400'; // 输入框背景
    const dividerColor = isDark ? 'bg-zinc-800' : 'bg-gray-200'; // 分隔线颜色
    const emptyStateIconColor = isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600' : 'bg-gray-100 border-gray-200 text-gray-400'; // 空状态图标颜色
    const emptyStateTextColor = isDark ? 'text-zinc-500' : 'text-gray-400'; // 空状态文字颜色
    const warningColor = isDark ? 'text-amber-400' : 'text-amber-600'; // 警告颜色

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
        <div className={`w-full h-full relative rounded-xl border ${containerBorder} ${containerBg} ${data.isStackOpen ? 'overflow-visible' : 'overflow-hidden'} shadow-lg group transition-colors duration-200`}>
             {/* 生成结果显示 */}
             {hasResult ? (
                 <LocalMediaStack 
                     data={data} 
                     updateData={updateData} 
                     currentSrc={data.imageSrc} 
                     onMaximize={onMaximize} 
                     isDark={isDark} 
                     selected={selected} 
                 />
             ) : (
                 <div className={`w-full h-full flex flex-col items-center justify-center ${emptyStateTextColor} grid-pattern`}>
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 border ${emptyStateIconColor}`}>
                         <Icons.ImagePlus size={20} className="opacity-50"/>
                     </div>
                     <span className="text-[11px] font-medium tracking-wide opacity-60">图生图</span>
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
                     <Icons.Loader2 size={24} className="text-yellow-500 animate-spin" />
                 </div>
             )}
        </div>

        {/* 控制面板 */}
        {isSelectedAndStable && showControls && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-full min-w-[400px] pt-3 z-[70] pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
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
                      <div className="relative group/input">
                          <textarea 
                              className={`w-full border rounded-xl p-3 text-[11px] leading-relaxed resize-none focus:outline-none min-h-[70px] no-scrollbar ${inputBg}`} 
                              placeholder="描述你想要的变化效果..." 
                              value={data.prompt || ''} 
                              onChange={(e) => updateData(data.id, { prompt: e.target.value })} 
                              onWheel={(e) => e.stopPropagation()}
                          />
                      </div>
                      <div className="flex items-center justify-between gap-2 h-7">
                          {/* 模型选择 */}
                          <LocalCustomDropdown 
                              options={imageModels} 
                              value={data.model || 'Banana 2'} 
                              onChange={(val: string) => updateData(data.id, { model: val })} 
                              isOpen={activeDropdown === 'model'} 
                              onToggle={() => setActiveDropdown(activeDropdown === 'model' ? null : 'model')} 
                              onClose={() => setActiveDropdown(null)} 
                              align="left" 
                              width="w-[120px]" 
                              isDark={isDark} 
                          />
                          <div className={`w-px h-3 ${dividerColor}`}></div>
                          <div className="flex items-center gap-1">
                              {/* 宽高比选择 */}
                              <LocalCustomDropdown 
                                  icon={Icons.Crop} 
                                  options={supportedRatios} 
                                  value={data.aspectRatio || '1:1'} 
                                  onChange={handleRatioChange} 
                                  isOpen={activeDropdown === 'ratio'} 
                                  onToggle={() => setActiveDropdown(activeDropdown === 'ratio' ? null : 'ratio')} 
                                  onClose={() => setActiveDropdown(null)} 
                                  isDark={isDark} 
                              />
                              {/* 分辨率选择 */}
                              <LocalCustomDropdown 
                                  icon={Icons.Monitor} 
                                  options={supportedResolutions} 
                                  value={data.resolution || '1k'} 
                                  onChange={(val: string) => updateData(data.id, { resolution: val })} 
                                  isOpen={activeDropdown === 'res'} 
                                  onToggle={() => setActiveDropdown(activeDropdown === 'res' ? null : 'res')} 
                                  onClose={() => setActiveDropdown(null)} 
                                  disabledOptions={['1k', '2k', '4k'].filter(r => !supportedResolutions.includes(r))} 
                                  isDark={isDark} 
                              />
                              {/* 生成数量选择 */}
                              <LocalCustomDropdown 
                                  icon={Icons.Layers} 
                                  options={[1, 2, 3, 4]} 
                                  value={data.count || 1} 
                                  onChange={(val: number) => updateData(data.id, { count: val })} 
                                  isOpen={activeDropdown === 'count'} 
                                  onToggle={() => setActiveDropdown(activeDropdown === 'count' ? null : 'count')} 
                                  onClose={() => setActiveDropdown(null)} 
                                  isDark={isDark} 
                              />
                              
                              {/* 提示词优化按钮 */}
                              <button 
                                  className={`h-full px-2 rounded flex items-center justify-center transition-colors ${canOptimize ? (data.promptOptimize ? (isDark ? 'text-yellow-400 bg-yellow-500/10' : 'text-yellow-600 bg-yellow-50') : (isDark ? 'text-zinc-500 hover:text-gray-300 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')) : (isDark ? 'text-zinc-700 opacity-50 cursor-not-allowed' : 'text-gray-200 opacity-50 cursor-not-allowed')}`} 
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
                              className={`ml-auto h-7 px-4 text-[11px] font-bold rounded-full flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98] whitespace-nowrap ${data.isLoading || !isConfigured || !hasInputImage ? 'opacity-50 cursor-not-allowed bg-zinc-600 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-500/20'}`} 
                              disabled={data.isLoading || !isConfigured || !hasInputImage} 
                              title={!isConfigured ? '请在设置中配置API Key' : !hasInputImage ? '需要连接输入图片' : '生成'}
                          >
                              {data.isLoading ? (
                                  <Icons.Loader2 className="animate-spin" size={12}/>
                              ) : (
                                  <Icons.Wand2 size={12} />
                              )}
                              <span>生成</span>
                          </button>
                      </div>
                 </div>
            </div>
        )}
      </>
    );
};
