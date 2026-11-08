import { CloudFile } from '../types/storage';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

export const listDriveFiles = async (accessToken: string): Promise<CloudFile[]> => {
  try {
    const query = encodeURIComponent("trashed = false and mimeType != 'application/vnd.google-apps.folder'");
    const fields = encodeURIComponent('files(id,name,size,mimeType,modifiedTime,createdTime,thumbnailLink,webViewLink,webContentLink,iconLink,starred)');
    
    const response = await fetch(`${DRIVE_API_URL}?q=${query}&fields=${fields}&pageSize=100&orderBy=modifiedTime desc`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Drive list warning:', errData);
      throw new Error(errData?.error?.message || `Failed to list Drive files: ${response.status}`);
    }

    const data = await response.json();
    const items: any[] = data.files || [];

    return items.map((f: any) => ({
      id: f.id,
      name: f.name,
      size: parseInt(f.size || '0', 10),
      mimeType: f.mimeType || 'application/octet-stream',
      modifiedTime: f.modifiedTime || new Date().toISOString(),
      createdTime: f.createdTime,
      thumbnailLink: f.thumbnailLink,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      iconLink: f.iconLink,
      isStarred: !!f.starred,
      driveFileId: f.id,
    }));
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    throw error;
  }
};

export const uploadDriveFile = async (
  accessToken: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<CloudFile> => {
  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    description: 'Uploaded via CloudVault',
    properties: {
      app: 'CloudVault',
    },
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const fileData = await fileDataPromise;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const fileHeader = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

  const encoder = new TextEncoder();
  const metadataBuffer = encoder.encode(metadataPart);
  const fileHeaderBuffer = encoder.encode(fileHeader);
  const closeDelimiterBuffer = encoder.encode(closeDelimiter);

  const totalLength =
    metadataBuffer.byteLength +
    fileHeaderBuffer.byteLength +
    fileData.byteLength +
    closeDelimiterBuffer.byteLength;

  const combinedBuffer = new Uint8Array(totalLength);
  let offset = 0;

  combinedBuffer.set(metadataBuffer, offset);
  offset += metadataBuffer.byteLength;

  combinedBuffer.set(fileHeaderBuffer, offset);
  offset += fileHeaderBuffer.byteLength;

  combinedBuffer.set(new Uint8Array(fileData), offset);
  offset += fileData.byteLength;

  combinedBuffer.set(closeDelimiterBuffer, offset);

  if (onProgress) onProgress(50);

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: combinedBuffer,
  });

  if (onProgress) onProgress(100);

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Upload failed with status ${response.status}`);
  }

  const createdFile = await response.json();

  return {
    id: createdFile.id,
    name: createdFile.name || file.name,
    size: file.size,
    mimeType: createdFile.mimeType || file.type || 'application/octet-stream',
    modifiedTime: new Date().toISOString(),
    webViewLink: createdFile.webViewLink,
    webContentLink: createdFile.webContentLink,
    isStarred: false,
    driveFileId: createdFile.id,
  };
};

export const deleteDriveFile = async (accessToken: string, fileId: string): Promise<void> => {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to delete file: ${response.status}`);
  }
};

export const downloadDriveFile = async (accessToken: string, file: CloudFile): Promise<void> => {
  const response = await fetch(`${DRIVE_API_URL}/${file.id}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
};

export const toggleStarDriveFile = async (
  accessToken: string,
  fileId: string,
  isCurrentlyStarred: boolean
): Promise<boolean> => {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      starred: !isCurrentlyStarred,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update starred status');
  }

  return !isCurrentlyStarred;
};

export const renameDriveFile = async (
  accessToken: string,
  fileId: string,
  newName: string
): Promise<void> => {
  const response = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: newName,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to rename file');
  }
};
