import { indexedDbService } from "./indexedDbService";

const readFileAsDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const saveAssetToIndexedDB = async (
  nodeId: string,
  url: string,
  type: "image" | "video",
): Promise<void> => {
  try {
    if (url.startsWith("data:")) {
      await indexedDbService.saveAsset("current", {
        id: `${nodeId}_${Date.now()}`,
        url,
        type,
        data: url,
      });
    } else if (url.startsWith("blob:")) {
      const response = await fetch(url);
      const blob = await response.blob();
      const base64Data = await readFileAsDataURL(blob);
      await indexedDbService.saveAsset("current", {
        id: `${nodeId}_${Date.now()}`,
        url,
        type,
        data: base64Data,
      });
    }
  } catch (e) {
    console.warn("[saveAssetToIndexedDB] 保存资产到IndexedDB失败:", e);
  }
};
