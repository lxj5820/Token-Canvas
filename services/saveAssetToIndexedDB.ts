import { indexedDbService } from "./indexedDbService";

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
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        await indexedDbService.saveAsset("current", {
          id: `${nodeId}_${Date.now()}`,
          url,
          type,
          data: base64Data,
        });
      };
      reader.readAsDataURL(blob);
    }
  } catch (e) {
    console.warn("[saveAssetToIndexedDB] 保存资产到IndexedDB失败:", e);
  }
};
