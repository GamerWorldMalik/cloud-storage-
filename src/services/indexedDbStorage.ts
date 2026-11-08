import { CloudFile } from '../types/storage';

const DB_NAME = 'CloudVaultDB';
const DB_VERSION = 1;
const STORE_FILES = 'files_store';
const STORE_BLOBS = 'blobs_store';

interface StoredBlob {
  id: string;
  blob: Blob;
}

export const openCloudDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveCloudFile = async (
  userId: string,
  fileMeta: CloudFile,
  fileBlob: Blob
): Promise<void> => {
  const db = await openCloudDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_FILES, STORE_BLOBS], 'readwrite');
    const filesStore = tx.objectStore(STORE_FILES);
    const blobsStore = tx.objectStore(STORE_BLOBS);

    const record = {
      ...fileMeta,
      userId,
    };

    filesStore.put(record);
    blobsStore.put({ id: fileMeta.id, blob: fileBlob });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadUserCloudFiles = async (userId: string): Promise<CloudFile[]> => {
  const db = await openCloudDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_FILES], 'readonly');
    const store = tx.objectStore(STORE_FILES);
    const request = store.getAll();

    request.onsuccess = () => {
      const all: any[] = request.result || [];
      const userFiles = all.filter((item) => item.userId === userId);
      resolve(
        userFiles.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
          createdTime: f.createdTime,
          isStarred: !!f.isStarred,
        }))
      );
    };
    request.onerror = () => reject(request.error);
  });
};

export const getCloudFileBlob = async (fileId: string): Promise<Blob | null> => {
  const db = await openCloudDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_BLOBS], 'readonly');
    const store = tx.objectStore(STORE_BLOBS);
    const request = store.get(fileId);

    request.onsuccess = () => {
      const result: StoredBlob | undefined = request.result;
      resolve(result ? result.blob : null);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteCloudFileRecord = async (fileId: string): Promise<void> => {
  const db = await openCloudDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_FILES, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_FILES).delete(fileId);
    tx.objectStore(STORE_BLOBS).delete(fileId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const updateCloudFileMeta = async (fileMeta: CloudFile): Promise<void> => {
  const db = await openCloudDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_FILES], 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const getReq = store.get(fileMeta.id);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing) {
        store.put({ ...existing, ...fileMeta });
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
};
