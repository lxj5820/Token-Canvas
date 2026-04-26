import { NodeType, NodeData } from "../types";
import { calculateImportDimensions } from "../services/canvasConstants";

export const importFileAsNode = (
  file: File,
  worldPos: { x: number; y: number },
  addNode: (
    type: NodeType,
    x?: number,
    y?: number,
    dataOverride?: Partial<NodeData>,
  ) => void,
) => {
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const { width, height, ratio } = calculateImportDimensions(
          img.width,
          img.height,
        );
        const src = event.target?.result as string;
        addNode(
          NodeType.ORIGINAL_IMAGE,
          worldPos.x - width / 2,
          worldPos.y - height / 2,
          {
            width,
            height,
            imageSrc: src,
            aspectRatio: `${ratio}:1`,
            outputArtifacts: [src],
          },
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  } else if (file.type.startsWith("video/")) {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const { width, height, ratio } = calculateImportDimensions(
        video.videoWidth,
        video.videoHeight,
      );
      addNode(
        NodeType.ORIGINAL_IMAGE,
        worldPos.x - width / 2,
        worldPos.y - height / 2,
        {
          width,
          height,
          videoSrc: url,
          title: file.name,
          aspectRatio: `${ratio}:1`,
          outputArtifacts: [url],
        },
      );
    };
    video.src = url;
  }
};
