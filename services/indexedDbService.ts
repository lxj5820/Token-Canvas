// NOTE: This DB (TokenCanvasDB) stores workflow data and assets.
// The storageService uses a separate DB (canvas_storage_db) for file system access and cache.
// These two DBs serve different purposes and should not be merged without careful migration.
const DB_NAME = "TokenCanvasDB";
const DB_VERSION = 1;
const STORES = {
  WORKFLOWS: "workflows",
  ASSETS: "assets",
};

class IndexedDbService {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建工作流存储
        if (!db.objectStoreNames.contains(STORES.WORKFLOWS)) {
          db.createObjectStore(STORES.WORKFLOWS, { keyPath: "id" });
        }

        // 创建资源存储
        if (!db.objectStoreNames.contains(STORES.ASSETS)) {
          const assetStore = db.createObjectStore(STORES.ASSETS, {
            keyPath: "id",
          });
          assetStore.createIndex("workflowId", "workflowId", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async saveWorkflow(workflowData: any): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.WORKFLOWS, "readwrite");
      const store = transaction.objectStore(STORES.WORKFLOWS);

      const request = store.put({
        id: "current",
        data: workflowData,
        updatedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getWorkflow(): Promise<any | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.WORKFLOWS, "readonly");
      const store = transaction.objectStore(STORES.WORKFLOWS);

      const request = store.get("current");

      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveAsset(
    workflowId: string,
    assetData: {
      id: string;
      url: string;
      type: "image" | "video";
      data: string;
    },
  ): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ASSETS, "readwrite");
      const store = transaction.objectStore(STORES.ASSETS);

      const request = store.put({
        ...assetData,
        workflowId,
        updatedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAssetsByWorkflow(workflowId: string): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ASSETS, "readonly");
      const store = transaction.objectStore(STORES.ASSETS);
      const index = store.index("workflowId");

      const request = index.getAll(workflowId);

      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllAssets(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ASSETS, "readonly");
      const store = transaction.objectStore(STORES.ASSETS);

      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAssetsByType(type: "image" | "video"): Promise<void> {
    const assets = await this.getAllAssets();
    const assetsToDelete = assets.filter((a) => a.type === type);

    if (assetsToDelete.length === 0) return;

    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ASSETS, "readwrite");
      const store = transaction.objectStore(STORES.ASSETS);

      let deletedCount = 0;
      assetsToDelete.forEach((asset) => {
        const request = store.delete(asset.id);
        request.onsuccess = () => {
          deletedCount++;
          if (deletedCount === assetsToDelete.length) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getAssetStats(): Promise<{
    count: number;
    totalSize: number;
    byType: Record<string, number>;
  }> {
    const assets = await this.getAllAssets();
    const stats = {
      count: 0,
      totalSize: 0,
      byType: {} as Record<string, number>,
    };

    for (const asset of assets) {
      stats.count++;
      let dataSize = 0;
      if (asset.data) {
        if (asset.data.startsWith("data:")) {
          // 格式: data:[mimeType];base64,[base64Data]
          const base64Part = asset.data.split(",")[1];
          if (base64Part) {
            // Base64编码：每4个字符 = 3个字节
            dataSize = Math.floor((base64Part.length * 3) / 4);
          }
        } else {
          // 纯base64字符串
          dataSize = Math.floor((asset.data.length * 3) / 4);
        }
      }
      stats.totalSize += dataSize;
      stats.byType[asset.type] = (stats.byType[asset.type] || 0) + dataSize;
    }

    return stats;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.WORKFLOWS, STORES.ASSETS],
        "readwrite",
      );

      const workflowStore = transaction.objectStore(STORES.WORKFLOWS);
      workflowStore.delete(workflowId);

      const assetStore = transaction.objectStore(STORES.ASSETS);
      const index = assetStore.index("workflowId");
      const request = index.openCursor(workflowId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.WORKFLOWS, STORES.ASSETS],
        "readwrite",
      );

      transaction.objectStore(STORES.WORKFLOWS).clear();
      transaction.objectStore(STORES.ASSETS).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const indexedDbService = new IndexedDbService();
