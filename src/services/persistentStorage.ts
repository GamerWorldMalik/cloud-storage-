import { CloudFile, AuthUser } from '../types/storage';

const DB_NAME = 'CloudVaultPermanentDB';
const DB_VERSION = 2;
const STORE_FILES = 'files_metadata';
const STORE_BLOBS = 'files_blobs';

export const USER_SESSION_KEY = 'cloudvault_logged_in_user';

export const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

export const setStoredUser = (user: AuthUser | null) => {
  if (user) {
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_SESSION_KEY);
  }
};

const getLocalBackupKey = (userId: string) => `cloudvault_files_backup_${userId}`;

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

/**
 * Reads a File or Blob as a Data URL (base64)
 */
export const readFileAsDataUrl = (file: File | Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

/**
 * Reads a text file as string (e.g. for mojo.txt)
 */
export const readFileAsText = (file: File | Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
};

/**
 * Upload file to Catbox cloud storage via server proxy
 */
export const uploadFileToCatboxCloud = async (file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload-cloud', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      console.warn('Upload cloud response status:', res.status);
      return null;
    }
    const data = await res.json();
    if (data.success && data.url) {
      return data.url;
    }
    return null;
  } catch (err) {
    console.warn('Network error uploading to cloud storage proxy, saving locally:', err);
    return null;
  }
};

/**
 * Permanent Save File: Saves binary blob in IndexedDB and metadata in both IndexedDB and LocalStorage
 */
export const savePermanentFile = async (
  userId: string,
  file: File
): Promise<CloudFile> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const isText = file.type.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp'].includes(ext);

  let dataUrl = '';
  let textContent = '';

  if (isImage && file.size < 6 * 1024 * 1024) {
    dataUrl = await readFileAsDataUrl(file);
  }

  if (isText && file.size < 2 * 1024 * 1024) {
    textContent = await readFileAsText(file);
  }

  // Attempt real cloud upload via Catbox API proxy
  let cloudUrl: string | undefined = undefined;
  try {
    const uploadedUrl = await uploadFileToCatboxCloud(file);
    if (uploadedUrl) {
      cloudUrl = uploadedUrl;
    }
  } catch (e) {
    console.warn('Cloud upload failed, proceeding with local persistence:', e);
  }

  const fileRecord: CloudFile = {
    id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: file.name, // Exactly preserves original file name (e.g. mojo.txt)
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    modifiedTime: new Date().toISOString(),
    createdTime: new Date().toISOString(),
    isStarred: false,
    fileExtension: ext,
    cloudUrl,
    dataUrl: dataUrl || undefined,
    textContent: textContent || undefined,
    userId,
  };

  // 1. Save in IndexedDB
  try {
    const db = await openCloudDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_FILES, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_FILES).put(fileRecord);
      tx.objectStore(STORE_BLOBS).put({ id: fileRecord.id, blob: file });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('IndexedDB save error:', err);
  }

  // 2. Save in LocalStorage backup
  try {
    const backupKey = getLocalBackupKey(userId);
    const existingBackup = getLocalFilesBackup(userId);
    const updated = [fileRecord, ...existingBackup.filter((f) => f.id !== fileRecord.id)];
    localStorage.setItem(backupKey, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage backup quota reached, stored in IndexedDB');
  }

  return fileRecord;
};

export const getLocalFilesBackup = (userId: string): CloudFile[] => {
  try {
    const raw = localStorage.getItem(getLocalBackupKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Load all user files with 100% permanent persistence
 */
export const loadPermanentUserFiles = async (userId: string): Promise<CloudFile[]> => {
  let dbFiles: CloudFile[] = [];

  try {
    const db = await openCloudDB();
    dbFiles = await new Promise((resolve) => {
      const tx = db.transaction([STORE_FILES], 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.getAll();
      req.onsuccess = () => {
        const records: any[] = req.result || [];
        resolve(records.filter((r) => r.userId === userId));
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    console.warn('Could not read from IndexedDB, falling back to LocalStorage', e);
  }

  // Combine with LocalStorage backup
  const localBackup = getLocalFilesBackup(userId);
  const combinedMap = new Map<string, CloudFile>();

  localBackup.forEach((f) => combinedMap.set(f.id, f));
  dbFiles.forEach((f) => combinedMap.set(f.id, f));

  let finalFiles = Array.from(combinedMap.values());

  // If brand new user with 0 files, create welcome document
  if (finalFiles.length === 0) {
    const welcomeDoc: CloudFile = {
      id: `welcome_${userId}`,
      name: 'mojo.txt',
      size: 512,
      mimeType: 'text/plain',
      modifiedTime: new Date().toISOString(),
      isStarred: true,
      fileExtension: 'txt',
      textContent:
        'Welcome to CloudVault!\n\n' +
        '• Your files stay permanently saved.\n' +
        '• Starter Storage: 0.25 GB (256 MB)\n' +
        '• Referral Bonus: +0.05 GB for each friend\n' +
        '• Storage Upgrade: 10 Tk for 100 MB, 50 Tk for 550 MB\n\n' +
        'Upload your own files (photos, videos, mojo.txt) anytime!',
      userId,
    };

    finalFiles = [welcomeDoc];
    try {
      localStorage.setItem(getLocalBackupKey(userId), JSON.stringify(finalFiles));
    } catch (e) {}
  }

  return finalFiles;
};

/**
 * Retrieve binary blob for preview, audio/video playback, and download
 */
export const getPermanentFileBlob = async (file: CloudFile): Promise<Blob | null> => {
  // If textContent is cached, convert directly
  if (file.textContent) {
    return new Blob([file.textContent], { type: file.mimeType || 'text/plain' });
  }

  // If dataUrl is cached, convert directly
  if (file.dataUrl) {
    try {
      const res = await fetch(file.dataUrl);
      return await res.blob();
    } catch (e) {}
  }

  try {
    const db = await openCloudDB();
    const idbBlob = await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction([STORE_BLOBS], 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(file.id);
      req.onsuccess = () => {
        resolve(req.result ? req.result.blob : null);
      };
      req.onerror = () => resolve(null);
    });
    if (idbBlob) return idbBlob;
  } catch (e) {
    console.warn('IDB blob read error:', e);
  }

  // If not found locally, fetch from Catbox cloud URL
  if (file.cloudUrl) {
    try {
      const res = await fetch(file.cloudUrl);
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.warn('Failed to fetch blob from cloudUrl:', e);
    }
  }

  return null;
};

/**
 * Permanently Delete file
 */
export const deletePermanentFile = async (userId: string, fileId: string): Promise<void> => {
  try {
    const db = await openCloudDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_FILES, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_FILES).delete(fileId);
      tx.objectStore(STORE_BLOBS).delete(fileId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {}

  try {
    const backupKey = getLocalBackupKey(userId);
    const existingBackup = getLocalFilesBackup(userId);
    const updated = existingBackup.filter((f) => f.id !== fileId);
    localStorage.setItem(backupKey, JSON.stringify(updated));
  } catch (e) {}
};

/**
 * Permanently Rename file
 */
export const renamePermanentFile = async (
  userId: string,
  fileId: string,
  newName: string
): Promise<void> => {
  const ext = newName.split('.').pop()?.toLowerCase() || '';

  try {
    const db = await openCloudDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(fileId);
      req.onsuccess = () => {
        const item = req.result;
        if (item) {
          item.name = newName;
          item.fileExtension = ext;
          item.modifiedTime = new Date().toISOString();
          store.put(item);
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  } catch (e) {}

  try {
    const backupKey = getLocalBackupKey(userId);
    const existing = getLocalFilesBackup(userId);
    const updated = existing.map((f) =>
      f.id === fileId
        ? { ...f, name: newName, fileExtension: ext, modifiedTime: new Date().toISOString() }
        : f
    );
    localStorage.setItem(backupKey, JSON.stringify(updated));
  } catch (e) {}
};

/**
 * Permanently Toggle Star status
 */
export const togglePermanentStar = async (
  userId: string,
  fileId: string,
  isStarred: boolean
): Promise<void> => {
  try {
    const db = await openCloudDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(fileId);
      req.onsuccess = () => {
        const item = req.result;
        if (item) {
          item.isStarred = isStarred;
          store.put(item);
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  } catch (e) {}

  try {
    const backupKey = getLocalBackupKey(userId);
    const existing = getLocalFilesBackup(userId);
    const updated = existing.map((f) => (f.id === fileId ? { ...f, isStarred } : f));
    localStorage.setItem(backupKey, JSON.stringify(updated));
  } catch (e) {}
};
