/**
 * setTimeout-based throttle (保留以备非动画场景使用)
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * requestAnimationFrame-based throttle
 * 与浏览器渲染帧同步，适合鼠标移动/拖拽等高频动画事件，
 * 不会积压 timer 队列，延迟最低 (~16ms at 60fps)。
 */
export const throttleRaf = <T extends (...args: unknown[]) => unknown>(
  func: T,
): ((...args: Parameters<T>) => void) => {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (...args: Parameters<T>) {
    lastArgs = args;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs !== null) {
          func(...lastArgs);
          lastArgs = null;
        }
        rafId = null;
      });
    }
  };
};
