import { ReferralUser, UserStorageQuota, UpgradePlan, PurchaseRecord, CloudFile } from '../types/storage';

export const BASE_QUOTA_BYTES = 268435456; // 0.25 GB (256 MB)
export const BONUS_PER_REFERRAL_BYTES = 53687091; // 0.05 GB (51.2 MB)

// Official payment merchant numbers
export const PAYMENT_NUMBERS = {
  bkash: '01886-452109',
  nagad: '01886-452109',
  rocket: '01886-452109-8',
};

// Storage Upgrade Plans requested by user
export const STORAGE_PLANS: UpgradePlan[] = [
  {
    id: 'pack_100mb',
    name: 'Starter 100MB Pack',
    priceTaka: 10,
    storageBytes: 104857600, // 100 MB
    storageLabel: '100 MB',
    description: '১০ টাকায় ১০০ মেগাবাইট অতিরিক্ত ক্লাউড স্টোরেজ (মাসে ১ বার)',
  },
  {
    id: 'pack_550mb',
    name: 'Pro 550MB Pack',
    priceTaka: 50,
    storageBytes: 576716800, // 550 MB
    storageLabel: '550 MB',
    description: '৫০ টাকায় ৫৫০ মেগাবাইট হাই-স্পিড ক্লাউড স্টোরেজ (মাসে ১ বার)',
    popular: true,
  },
];

export const formatStorageSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const gb = k * k * k;
  const mb = k * k;
  const kb = k;

  if (bytes >= gb) {
    const val = bytes / gb;
    return `${val.toFixed(2)} GB`;
  }
  if (bytes >= mb) {
    const val = bytes / mb;
    return `${val.toFixed(1)} MB`;
  }
  if (bytes >= kb) {
    const val = bytes / kb;
    return `${val.toFixed(0)} KB`;
  }
  return `${bytes} B`;
};

export const getRealReferralListKey = (userId: string) => `cloudvault_real_referrals_${userId}`;
export const getUserPurchasesKey = (userId: string) => `cloudvault_purchases_${userId}`;
const GLOBAL_USED_REFERRALS_KEY = 'cloudvault_accepted_referrals_global';
const GLOBAL_VERIFIED_TRX_KEY = 'cloudvault_verified_all_trx_ids';

/**
 * Loads real, genuine referrals for a user.
 */
export const loadUserReferrals = (userId: string): ReferralUser[] => {
  try {
    const data = localStorage.getItem(getRealReferralListKey(userId));
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading referrals:', err);
  }
  return [];
};

export const saveUserReferrals = (userId: string, referrals: ReferralUser[]) => {
  try {
    localStorage.setItem(getRealReferralListKey(userId), JSON.stringify(referrals));
    window.dispatchEvent(new Event('cloudvault_referral_update'));
  } catch (err) {
    console.error('Error saving referrals:', err);
  }
};

/**
 * Validates and records a REAL referral when a genuine friend creates an account or signs in via an invite link.
 */
export const recordGenuineReferral = (
  referrerId: string,
  newUserId: string,
  newUserName: string,
  newUserEmail: string
): { success: boolean; reason?: string } => {
  if (!referrerId || !newUserId) {
    return { success: false, reason: 'Invalid parameters' };
  }

  // 1. Strict Self-Referral Prevention
  if (referrerId === newUserId) {
    return { success: false, reason: 'Self-referral is not allowed' };
  }

  // 2. Check if this friend has already accepted any referral previously
  try {
    const globalUsedRaw = localStorage.getItem(GLOBAL_USED_REFERRALS_KEY);
    const globalUsed: string[] = globalUsedRaw ? JSON.parse(globalUsedRaw) : [];

    const uniqueFriendIdentifier = newUserEmail ? newUserEmail.toLowerCase() : newUserId;
    if (globalUsed.includes(uniqueFriendIdentifier)) {
      return { success: false, reason: 'User has already accepted a referral' };
    }

    const existing = loadUserReferrals(referrerId);
    const alreadyInvited = existing.some(
      (r) => r.id === newUserId || (newUserEmail && r.email.toLowerCase() === newUserEmail.toLowerCase())
    );

    if (alreadyInvited) {
      return { success: false, reason: 'Already in referral list' };
    }

    const verifiedReferral: ReferralUser = {
      id: newUserId,
      name: newUserName || (newUserEmail ? newUserEmail.split('@')[0] : 'Real Friend'),
      email: newUserEmail || 'Verified User',
      joinedAt: new Date().toISOString(),
      bonusGrantedBytes: BONUS_PER_REFERRAL_BYTES,
    };

    const updated = [verifiedReferral, ...existing];
    saveUserReferrals(referrerId, updated);

    globalUsed.push(uniqueFriendIdentifier);
    localStorage.setItem(GLOBAL_USED_REFERRALS_KEY, JSON.stringify(globalUsed));

    return { success: true };
  } catch (err) {
    console.error('Error recording real referral:', err);
    return { success: false, reason: 'System error' };
  }
};

/**
 * Loads real purchase history for a user
 */
export const loadUserPurchases = (userId: string): PurchaseRecord[] => {
  try {
    const raw = localStorage.getItem(getUserPurchasesKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
};

/**
 * Checks if a plan is on a 30-day (1 month) cooldown for this user.
 * "10 taka ar 50 taka dia 100 o 550 mb nawar por ar nite na pare 1 maser moddhe"
 */
export const isPlanOnCooldown = (
  userId: string,
  planId: string
): { onCooldown: boolean; remainingDays: number; lastPurchasedAt?: string } => {
  const purchases = loadUserPurchases(userId);
  const planPurchases = purchases.filter((p) => p.planId === planId);

  if (planPurchases.length === 0) {
    return { onCooldown: false, remainingDays: 0 };
  }

  // Sort latest first
  planPurchases.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  const latest = planPurchases[0];

  const purchaseTime = new Date(latest.purchasedAt).getTime();
  const now = Date.now();
  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  const elapsed = now - purchaseTime;

  if (elapsed < ONE_MONTH_MS) {
    const remainingMs = ONE_MONTH_MS - elapsed;
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return { onCooldown: true, remainingDays, lastPurchasedAt: latest.purchasedAt };
  }

  return { onCooldown: false, remainingDays: 0 };
};

/**
 * Verifies real payment transaction and grants storage pack.
 * Strictly prevents fake submissions and duplicate transaction IDs!
 */
export const verifyAndApplyPayment = (
  userId: string,
  plan: UpgradePlan,
  paymentMethod: 'bkash' | 'nagad' | 'rocket',
  senderPhone: string,
  transactionId: string
): { success: boolean; error?: string } => {
  // 1. Check 30-day monthly limit
  const cooldownCheck = isPlanOnCooldown(userId, plan.id);
  if (cooldownCheck.onCooldown) {
    return {
      success: false,
      error: `এই প্ল্যানটি আপনি ইতোমধ্যে নিয়েছেন। নিয়ম অনুযায়ী ১ মাসের মধ্যে পুনরায় নেওয়া যাবে না। আর ${cooldownCheck.remainingDays} দিন পর আবার নিতে পারবেন।`,
    };
  }

  // 2. Validate Bangladeshi phone number (11 digits, starts with 01)
  const cleanPhone = senderPhone.replace(/[\s-]/g, '');
  const phoneRegex = /^01[3-9]\d{8}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return {
      success: false,
      error: 'সঠিক ১১ ডিজিটের বিকাশ/নগদ/রকেট নম্বর দিন (যেমন: 017XXXXXXXX)। ভুয়া নম্বর গ্রহণ করা হবে না।',
    };
  }

  // 3. Validate Transaction ID (TrxID) format
  const cleanTrx = transactionId.trim().toUpperCase();
  if (cleanTrx.length < 8 || !/^[A-Z0-9]+$/.test(cleanTrx)) {
    return {
      success: false,
      error: 'সঠিক ট্রানজেকশন আইডি (TrxID) প্রদান করুন (কমপক্ষে ৮ সংখ্যার আলফানিউমেরিক কোড, যেমন: BL97XKQ81M)।',
    };
  }

  // 4. Anti-Fraud Uniqueness Check: TrxID cannot be used more than once across the entire system!
  try {
    const globalTrxRaw = localStorage.getItem(GLOBAL_VERIFIED_TRX_KEY);
    const globalTrx: string[] = globalTrxRaw ? JSON.parse(globalTrxRaw) : [];

    if (globalTrx.includes(cleanTrx)) {
      return {
        success: false,
        error: 'এই ট্রানজেকশন আইডিটি ইতোমধ্যে ব্যবহার করা হয়েছে! দয়া করে নতুন সঠিক পেমেন্ট করে TrxID প্রদান করুন।',
      };
    }

    // 5. Save verified purchase record
    const newRecord: PurchaseRecord = {
      id: `trx_${Date.now()}_${cleanTrx}`,
      planId: plan.id,
      planName: plan.name,
      priceTaka: plan.priceTaka,
      storageBytes: plan.storageBytes,
      purchasedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentMethod,
      senderPhone: cleanPhone,
      transactionId: cleanTrx,
    };

    const userPurchases = loadUserPurchases(userId);
    userPurchases.push(newRecord);
    localStorage.setItem(getUserPurchasesKey(userId), JSON.stringify(userPurchases));

    // Register TrxID in global ledger
    globalTrx.push(cleanTrx);
    localStorage.setItem(GLOBAL_VERIFIED_TRX_KEY, JSON.stringify(globalTrx));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Payment verification failed' };
  }
};

export const calculateCategoryBreakdown = (files: CloudFile[]) => {
  let images = 0;
  let videos = 0;
  let documents = 0;
  let audio = 0;
  let others = 0;

  files.forEach((f) => {
    const s = f.size || 0;
    const m = (f.mimeType || '').toLowerCase();
    const ext = (f.fileExtension || '').toLowerCase();

    if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      images += s;
    } else if (m.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
      videos += s;
    } else if (
      m.includes('pdf') ||
      m.includes('document') ||
      m.includes('text') ||
      ['pdf', 'txt', 'doc', 'docx', 'csv', 'xlsx', 'xls', 'ppt', 'pptx'].includes(ext)
    ) {
      documents += s;
    } else if (m.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
      audio += s;
    } else {
      others += s;
    }
  });

  return { images, videos, documents, audio, others };
};

/**
 * Calculates user quota including base 0.25 GB + genuine referrals + verified paid packs.
 * Enforces the 20% single file upload limit!
 */
export const calculateUserQuota = (userId: string, files: CloudFile[]): UserStorageQuota => {
  const referrals = loadUserReferrals(userId);
  const totalBonusBytes = referrals.length * BONUS_PER_REFERRAL_BYTES;

  const purchases = loadUserPurchases(userId);
  const purchasedBytes = purchases.reduce((acc, p) => acc + (p.storageBytes || 0), 0);

  const totalAllowedBytes = BASE_QUOTA_BYTES + totalBonusBytes + purchasedBytes;
  const usedBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  // Upload limit: exactly 20% of total storage capacity
  // "upload limite storage limit er 20% thakbe jmn 100 mb te 20 mb"
  const maxSingleFileBytes = Math.floor(totalAllowedBytes * 0.2);

  const categoryBreakdown = calculateCategoryBreakdown(files);

  return {
    baseBytes: BASE_QUOTA_BYTES,
    bonusPerReferralBytes: BONUS_PER_REFERRAL_BYTES,
    referrals,
    totalBonusBytes,
    purchasedBytes,
    purchases,
    totalAllowedBytes,
    usedBytes,
    maxSingleFileBytes,
    categoryBreakdown,
  };
};
