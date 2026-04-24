import React from 'react';
import { Icons } from '../../Icons';
import { safeDownload } from './LocalNodeComponents';

interface ImageNodeToolbarProps {
  imageSrc?: string;
  nodeId?: string;
  onMaximize?: (id: string) => void;
  onAnnotate?: () => void;
  isAnnotating?: boolean;
  isDark?: boolean;
  onGridSplit?: (rows: number, cols: number) => void;
  onAngleEdit?: () => void;
  isAngleEditing?: boolean;
  onLightEdit?: () => void;
  isLightEditing?: boolean;
}

export const ImageNodeToolbar: React.FC<ImageNodeToolbarProps> = ({
    imageSrc,
    nodeId,
    onMaximize,
    onAnnotate,
    isAnnotating = false,
    isDark = true,
    onGridSplit,
    onAngleEdit,
    isAngleEditing = false,
    onLightEdit,
    isLightEditing = false
}) => {
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

    // 文字按钮基础样式
    const textBtnBase = isDark
        ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50 active:bg-zinc-600/50'
        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200';
    const textBtnActive = isDark
        ? 'text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30'
        : 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200';

    // 图标按钮基础样式
    const iconBtnBase = isDark
        ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/50 active:bg-zinc-600/50'
        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200';
    const iconBtnActive = isDark
        ? 'text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30'
        : 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200';

    const separator = isDark ? 'bg-zinc-600' : 'bg-gray-300';

    return (
        <div className={`bg-[#1a1a1a]/95 backdrop-blur-xl border-zinc-700/50 box-border flex w-fit items-center justify-center gap-1.5 rounded-xl p-1.5 border shadow-md`}>
            {/* 多角度 */}
            <button
                className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 gap-1 px-2.5 cursor-pointer ${isAngleEditing ? textBtnActive : textBtnBase}`}
                title="多角度"
                onClick={onAngleEdit}
            >
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" className="iconify iconify--libtv pointer-events-none h-4 w-4" width="1em" height="1em" viewBox="0 0 21.6006 21.8008"><path d="M10.9004 0C12.2479 0 13.392 0.77456 14.2607 1.86621C15.0486 2.8563 15.672 4.1803 16.1045 5.69141C16.6345 5.84296 17.138 6.0177 17.6104 6.21289C19.4301 6.96498 20.9374 8.09253 21.5342 9.56152C21.7212 10.022 21.4996 10.5473 21.0391 10.7344C20.5786 10.9214 20.0533 10.6997 19.8662 10.2393C19.536 9.42632 18.5618 8.55336 16.9229 7.87598C15.3185 7.21299 13.2198 6.80078 10.9004 6.80078C9.56763 6.80078 8.30935 6.93585 7.17676 7.17676C6.93585 8.30935 6.80078 9.56763 6.80078 10.9004C6.80078 12.2328 6.93598 13.4907 7.17676 14.623C8.3094 14.864 9.56755 15 10.9004 15C12.6499 15 14.2702 14.7645 15.6475 14.3662L13.7002 13.416C13.2535 13.1982 13.0674 12.6596 13.2852 12.2129C13.503 11.7661 14.0425 11.581 14.4893 11.7988L18.3027 13.6582C18.7495 13.8761 18.9356 14.4155 18.7178 14.8623L16.8574 18.6758C16.6396 19.1224 16.101 19.3084 15.6543 19.0908C15.2075 18.8729 15.0214 18.3335 15.2393 17.8867L16.1074 16.1064C14.5538 16.5512 12.7763 16.8008 10.9004 16.8008C9.80222 16.8008 8.7375 16.7143 7.73145 16.5547C7.86602 16.9159 8.01286 17.2552 8.16992 17.5693C9.02695 19.2832 10.0445 20 10.9004 20C11.119 20 11.3398 19.9565 11.5625 19.8662C12.023 19.6797 12.5476 19.9018 12.7344 20.3623C12.9211 20.8229 12.6989 21.3474 12.2383 21.5342C11.815 21.7058 11.3657 21.8008 10.9004 21.8008C8.99534 21.8008 7.51227 20.2793 6.55957 18.374C6.21973 17.6943 5.92948 16.9318 5.69336 16.1064C4.86847 15.8704 4.10612 15.5809 3.42676 15.2412C1.5215 14.2885 0 12.8054 0 10.9004C0 8.99534 1.5215 7.51227 3.42676 6.55957C4.10619 6.21985 4.86837 5.92944 5.69336 5.69336C5.92944 4.86837 6.21985 4.10619 6.55957 3.42676C7.51227 1.5215 8.99534 0 10.9004 0ZM5.24512 7.73145C4.88418 7.86593 4.54531 8.01298 4.23145 8.16992C2.51763 9.02695 1.80078 10.0445 1.80078 10.9004C1.80078 11.7563 2.51763 12.7738 4.23145 13.6309C4.54522 13.7878 4.8843 13.9339 5.24512 14.0684C5.08559 13.0626 5 11.9982 5 10.9004C5 9.80227 5.0855 8.73746 5.24512 7.73145ZM10.9004 1.80078C10.0445 1.80078 9.02695 2.51763 8.16992 4.23145C8.01298 4.54531 7.86593 4.88418 7.73145 5.24512C8.73746 5.0855 9.80227 5 10.9004 5C11.9977 5 13.0608 5.08515 14.0645 5.24414C13.7217 4.32451 13.3084 3.56012 12.8525 2.9873C12.1821 2.14481 11.5048 1.80078 10.9004 1.80078Z" fill="currentColor"></path></svg>
                <span className="whitespace-nowrap text-xs leading-none">多角度</span>
            </button>

            {/* 灯光 */}
            <button
                className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 gap-1 px-2.5 cursor-pointer ${isLightEditing ? textBtnActive : textBtnBase}`}
                title="灯光"
                data-testid="image-toolbar-light"
                onClick={onLightEdit}
            >
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" className="iconify iconify--libtv pointer-events-none h-4 w-4" width="1em" height="1em" viewBox="0 0 16 16"><path d="M8.00098 11.7334C8.33224 11.7334 8.60139 12.0018 8.60156 12.333V14C8.60156 14.3314 8.33235 14.6006 8.00098 14.6006C7.66961 14.6006 7.40039 14.3314 7.40039 14V12.333C7.40057 12.0018 7.66971 11.7334 8.00098 11.7334ZM3.97656 10.1758C4.21089 9.94156 4.59091 9.9415 4.8252 10.1758C5.05948 10.4101 5.05941 10.7901 4.8252 11.0244L3.8916 11.958C3.65726 12.192 3.27717 12.1922 3.04297 11.958C2.80876 11.7238 2.80898 11.3437 3.04297 11.1094L3.97656 10.1758ZM11.1768 10.1758C11.4111 9.94153 11.7911 9.94153 12.0254 10.1758L12.959 11.1094C13.1929 11.3437 13.1931 11.7238 12.959 11.958C12.7247 12.1923 12.3437 12.1923 12.1094 11.958L11.1768 11.0244C10.9425 10.7901 10.9425 10.4101 11.1768 10.1758ZM10.668 6.39941C10.9992 6.39959 11.2676 6.66874 11.2676 7C11.2676 7.86637 10.9232 8.69695 10.3105 9.30957C9.69793 9.92219 8.86735 10.2666 8.00098 10.2666C7.1346 10.2666 6.30403 9.92219 5.69141 9.30957C5.07879 8.69695 4.73438 7.86637 4.73438 7C4.73438 6.66874 5.00276 6.39959 5.33398 6.39941C5.66536 6.39941 5.93457 6.66863 5.93457 7C5.93457 7.54811 6.15149 8.07434 6.53906 8.46191C6.92664 8.84949 7.45286 9.06641 8.00098 9.06641C8.54909 9.06641 9.07532 8.84949 9.46289 8.46191C9.85047 8.07434 10.0674 7.54811 10.0674 7C10.0674 6.66863 10.3366 6.39941 10.668 6.39941ZM2.66797 6.39941C2.99919 6.39959 3.26758 6.66874 3.26758 7C3.26758 7.33126 2.99919 7.60041 2.66797 7.60059H1.33398C1.00276 7.60041 0.734375 7.33126 0.734375 7C0.734375 6.66874 1.00276 6.39959 1.33398 6.39941H2.66797ZM14.668 6.39941C14.9992 6.39959 15.2676 6.66874 15.2676 7C15.2676 7.33126 14.9992 7.60041 14.668 7.60059H13.334C13.0028 7.60041 12.7344 7.33126 12.7344 7C12.7344 6.66874 13.0028 6.39959 13.334 6.39941H14.668ZM14.668 3.7334C14.9991 3.73357 15.2674 4.00189 15.2676 4.33301C15.2676 4.66427 14.9992 4.93342 14.668 4.93359H1.33398C1.00276 4.93342 0.734375 4.66427 0.734375 4.33301C0.734551 4.0019 1.00287 3.73357 1.33398 3.7334H14.668ZM12.001 1.39941C12.3323 1.39941 12.6016 1.66863 12.6016 2C12.6016 2.33137 12.3323 2.60059 12.001 2.60059H4.00098C3.66961 2.60059 3.40039 2.33137 3.40039 2C3.40039 1.66863 3.66961 1.39941 4.00098 1.39941H12.001Z" fill="currentColor"></path></svg>
                <span className="whitespace-nowrap text-xs leading-none">灯光</span>
            </button>

            {/* 宫格切分 */}
            <button
                className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 gap-1 px-2.5 cursor-pointer ${textBtnBase}`}
                title="宫格切分"
                onClick={() => onGridSplit?.(3, 3)}
            >
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--libtv pointer-events-none h-4 w-4 shrink-0" width="1em" height="1em" viewBox="0 0 16 16"><path d="M4.75586 2C4.97659 2.00021 5.15527 2.17961 5.15527 2.40039V4.11523H10.8711V2.40039C10.8711 2.17948 11.0506 2 11.2715 2H11.5107C11.7317 2 11.9111 2.17948 11.9111 2.40039V4.11523H13.5996C13.8205 4.11523 14 4.29471 14 4.51562V4.75586C13.9998 4.97659 13.8204 5.15527 13.5996 5.15527H11.9111V10.8711H13.5996C13.8205 10.8711 14 11.0506 14 11.2715V11.5107C14 11.7317 13.8205 11.9111 13.5996 11.9111H11.9111V13.5996C11.9111 13.8205 11.7317 14 11.5107 14H11.2715C11.0506 14 10.8711 13.8205 10.8711 13.5996V11.9111H5.15527V13.5996C5.15527 13.8204 4.97659 13.9998 4.75586 14H4.51562C4.29471 14 4.11523 13.8205 4.11523 13.5996V11.9111H2.40039C2.17948 11.9111 2 11.7317 2 11.5107V11.2715C2 11.0506 2.17948 10.8711 2.40039 10.8711H4.11523V5.15527H2.40039C2.17961 5.15527 2.00021 4.97659 2 4.75586V4.51562C2 4.29471 2.17948 4.11523 2.40039 4.11523H4.11523V2.40039C4.11523 2.17948 4.29471 2 4.51562 2H4.75586ZM5.15527 10.8711H10.8711V5.15527H5.15527V10.8711Z" fill="currentColor"></path></svg>
                <span className="whitespace-nowrap text-xs leading-none">宫格切分</span>
            </button>

            {/* 分隔线 - 文字区和图标区 */}
            <div className={`${separator} mx-0.5 h-5 w-px`} aria-hidden="true" />

            {/* 标注 */}
            <button
                className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${isAnnotating ? iconBtnActive : iconBtnBase}`}
                title="标注"
                onClick={onAnnotate}
            >
                <Icons.Edit3 size={13} />
            </button>

            {/* 下载 */}
            <button
                className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
                title="下载"
                onClick={handleDownload}
            >
                <Icons.Download size={13} />
            </button>

            {/* 预览 */}
            <button
                className={`inline-flex select-none items-center justify-center rounded-lg transition-colors h-7 w-7 min-w-7 p-1.5 cursor-pointer ${iconBtnBase}`}
                title="预览"
                onClick={handlePreview}
            >
                <Icons.Maximize2 size={13} />
            </button>
        </div>
    );
};
