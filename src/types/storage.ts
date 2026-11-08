export interface CloudFile {
  id: string;
  name: string;
  size: number; // in bytes
  mimeType: string;
  modifiedTime: string;
  createdTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  isStarred?: boolean;
  driveFileId?: string;
  blobUrl?: string; // cached object URL in memory
  dataUrl?: string; // persistent Base64 / thumbnail
  textContent?: string; // cached text content for txt/code files
  fileExtension?: string;
  userId?: string;
}

export interface ReferralUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: string;
  bonusGrantedBytes: number; // 0.05 GB = 53,687,091 bytes
}

export interface UpgradePlan {
  id: string;
  name: string;
  priceTaka: number;
  storageBytes: number; // in bytes
  storageLabel: string;
  description: string;
  popular?: boolean;
}

export interface PurchaseRecord {
  id: string;
  planId: string;
  planName: string;
  priceTaka: number;
  storageBytes: number;
  purchasedAt: string;
  expiresAt: string; // 30 days later
  paymentMethod: 'bkash' | 'nagad' | 'rocket';
  senderPhone: string;
  transactionId: string;
}

export interface UserStorageQuota {
  baseBytes: number; // 0.25 GB = 268,435,456 bytes
  bonusPerReferralBytes: number; // 0.05 GB = 53,687,091 bytes
  referrals: ReferralUser[];
  totalBonusBytes: number;
  purchasedBytes: number; // from paid storage packs
  purchases: PurchaseRecord[];
  totalAllowedBytes: number; // baseBytes + totalBonusBytes + purchasedBytes
  usedBytes: number;
  maxSingleFileBytes: number; // exactly 20% of totalAllowedBytes
  categoryBreakdown?: {
    images: number;
    videos: number;
    documents: number;
    audio: number;
    others: number;
  };
}

export type ViewMode = 'grid' | 'list';
export type FileCategory = 'all' | 'images' | 'documents' | 'media' | 'archives' | 'starred';
export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';
export type Language = 'bn' | 'en';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isGoogleUser?: boolean;
}
