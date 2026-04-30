import { useCallback, useEffect, useRef } from "react";
import { CanvasTransform } from "../types";
import { ZOOM_MIN, ZOOM_MAX } from "../services/canvasConstants";

interface UseZoomParams {
  transform: CanvasTransform;
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>;
  nodes: { x: number; y: number; width: number; height: number }[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const getZoomStep = (currentK: number) => 0.08 * (currentK / 1);

export const useZoom = ({
  transform,
  setTransform,
  nodes,
  containerRef,
}: UseZoomParams) => {
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const handleZoomIn = useCallback(() => {
    setTransform((prev) => {
      const step = getZoomStep(prev.k);
      const newK = Math.min(prev.k + step, ZOOM_MAX);
      const container = containerRef.current;
      if (!container) return { ...prev, k: newK };
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (centerX - prev.x) / prev.k;
      const worldY = (centerY - prev.y) / prev.k;
      return {
        x: centerX - worldX * newK,
        y: centerY - worldY * newK,
        k: newK,
      };
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform((prev) => {
      const step = getZoomStep(prev.k);
      const newK = Math.max(prev.k - step, ZOOM_MIN);
      const container = containerRef.current;
      if (!container) return { ...prev, k: newK };
      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (centerX - prev.x) / prev.k;
      const worldY = (centerY - prev.y) / prev.k;
      return {
        x: centerX - worldX * newK,
        y: centerY - worldY * newK,
        k: newK,
      };
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    if (nodes.length === 0) {
      setTransform({ x: 0, y: 0, k: 1 });
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    nodes.forEach((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    const container = containerRef.current;
    if (!container) {
      setTransform({ x: 0, y: 0, k: 1 });
      return;
    }
    const padding = 50;
    const scaleX = (container.clientWidth - padding * 2) / (maxX - minX);
    const scaleY = (container.clientHeight - padding * 2) / (maxY - minY);
    const newScale = Math.min(scaleX, scaleY, 1);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setTransform({
      x: container.clientWidth / 2 - centerX * newScale,
      y: container.clientHeight / 2 - centerY * newScale,
      k: newScale,
    });
  }, [nodes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isInsideScrollable = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      let el: HTMLElement | null = target;
      while (el && el !== container) {
        if (el.classList.contains("nowheel")) return true;
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        const isScrollableY =
          (overflowY === "auto" || overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight;
        const isScrollableX =
          (overflowX === "auto" || overflowX === "scroll") &&
          el.scrollWidth > el.clientWidth;
        if (isScrollableY || isScrollableX) return true;
        if (el.tagName === "TEXTAREA") return true;
        el = el.parentElement;
      }
      return false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (isInsideScrollable(e.target)) return;
      e.preventDefault();
      const currentTransform = transformRef.current;
      const zoomIntensity = 0.1;
      const direction = e.deltaY > 0 ? -1 : 1;
      let newK = currentTransform.k + direction * zoomIntensity;
      newK = Math.min(Math.max(ZOOM_MIN, newK), ZOOM_MAX);
      const rect = container.getBoundingClientRect();
      if (!rect) return;
      const worldX =
        (e.clientX - rect.left - currentTransform.x) / currentTransform.k;
      const worldY =
        (e.clientY - rect.top - currentTransform.y) / currentTransform.k;
      setTransform({
        x: e.clientX - rect.left - worldX * newK,
        y: e.clientY - rect.top - worldY * newK,
        k: newK,
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return { handleZoomIn, handleZoomOut, handleZoomReset };
};
