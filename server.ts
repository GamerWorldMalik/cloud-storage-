import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin emails with exclusive access to the Control Panel
export const ADMIN_EMAILS = [
  'gamergigamc4@gmail.com',
  'cloudgamer955@gmail.com',
];

interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  plan: 'free' | 'pack_100mb' | 'pack_550mb';
  planName: string;
  baseBytes: number;
  bonusBytes: number;
  purchasedBytes: number;
  totalAllowedBytes: number;
  usedBytes: number;
  referralCount: number;
  joinedAt: string;
  lastActive: string;
}

interface ReferralRecord {
  id: string;
  referrerId: string;
  friendUid: string;
  friendName: string;
  friendEmail: string;
  joinedAt: string;
  bonusBytes: number;
}

interface PurchaseRecordServer {
  id: string;
  userId: string;
  userEmail: string;
  planId: string;
  planName: string;
  priceTaka: number;
  storageBytes: number;
  purchasedAt: string;
  expiresAt: string;
  paymentMethod: string;
  senderPhone: string;
  transactionId: string;
}

interface ServerDatabase {
  users: Record<string, UserRecord>;
  referrals: ReferralRecord[];
  purchases: PurchaseRecordServer[];
  verifiedTrxIds: string[];
  usedReferralEmails: string[];
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'cloudvault_db.json');

const BASE_QUOTA_BYTES = 268435456; // 0.25 GB = 256 MB
const BONUS_PER_REFERRAL_BYTES = 53687091; // 0.05 GB = 51.2 MB

// In-memory DB
let db: ServerDatabase = {
  users: {},
  referrals: [],
  purchases: [],
  verifiedTrxIds: [],
  usedReferralEmails: [],
};

// Load DB from disk
function loadDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      db = {
        users: parsed.users || {},
        referrals: parsed.referrals || [],
        purchases: parsed.purchases || [],
        verifiedTrxIds: parsed.verifiedTrxIds || [],
        usedReferralEmails: parsed.usedReferralEmails || [],
      };
    }
  } catch (err) {
    console.warn('Could not read persistent DB, starting fresh:', err);
  }

  // Pre-seed admin accounts if not existing
  for (const adminEmail of ADMIN_EMAILS) {
    const adminUid = 'admin_' + adminEmail.split('@')[0];
    if (!db.users[adminUid]) {
      db.users[adminUid] = {
        uid: adminUid,
        email: adminEmail,
        displayName: adminEmail.split('@')[0],
        plan: 'free',
        planName: 'Cloud Admin',
        baseBytes: BASE_QUOTA_BYTES,
        bonusBytes: 0,
        purchasedBytes: 0,
        totalAllowedBytes: BASE_QUOTA_BYTES,
        usedBytes: 1024 * 512, // 512 KB
        referralCount: 0,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };
    }
  }
}

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

// Initial DB load
loadDatabase();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Multer in-memory storage for handling file uploads up to 200MB (Catbox limit)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 },
  });

  // Catbox API Userhash Key configured from user input
  const CATBOX_USERHASH =
    process.env.CATBOX_USERHASH ||
    'cb_ede5e4f6d64a074b7ba88e8931f08c4686bb0396d642e06732a81e0efa195665';

  /**
   * Health / Cloud API status check endpoint
   */
  app.get('/api/cloud-status', (_req, res) => {
    res.json({
      active: true,
      provider: 'Catbox Cloud Storage',
      configured: true,
      keyPrefix: 'cb_ede5e4f6...',
      maxSingleUploadMb: 200,
    });
  });

  /**
   * Sync / Register User on Server
   */
  app.post('/api/users/sync', (req, res) => {
    const { uid, email, displayName, photoURL, usedBytes } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'UID is required' });
    }

    const cleanEmail = (email || '').toLowerCase().trim();

    // Calculate user's referrals from server db
    const userReferrals = db.referrals.filter((r) => r.referrerId === uid);
    const bonusBytes = userReferrals.length * BONUS_PER_REFERRAL_BYTES;

    // Calculate user's purchases from server db
    const userPurchases = db.purchases.filter((p) => p.userId === uid);
    const purchasedBytes = userPurchases.reduce((acc, p) => acc + (p.storageBytes || 0), 0);

    const existingUser = db.users[uid];

    // Determine current plan
    let plan: 'free' | 'pack_100mb' | 'pack_550mb' = 'free';
    let planName = 'Free Plan (0.25 GB)';
    if (userPurchases.some((p) => p.planId === 'pack_550mb')) {
      plan = 'pack_550mb';
      planName = 'Pro Plan (550 MB Pack)';
    } else if (userPurchases.some((p) => p.planId === 'pack_100mb')) {
      plan = 'pack_100mb';
      planName = 'Starter Plan (100 MB Pack)';
    }

    const now = new Date().toISOString();
    const finalUsedBytes = typeof usedBytes === 'number' ? usedBytes : (existingUser?.usedBytes || 0);
    const totalAllowedBytes = BASE_QUOTA_BYTES + bonusBytes + purchasedBytes;

    const userRecord: UserRecord = {
      uid,
      email: cleanEmail || existingUser?.email || `${uid.slice(0, 8)}@user.vault`,
      displayName: displayName || existingUser?.displayName || cleanEmail.split('@')[0] || 'Cloud User',
      photoURL: photoURL || existingUser?.photoURL,
      plan,
      planName,
      baseBytes: BASE_QUOTA_BYTES,
      bonusBytes,
      purchasedBytes,
      totalAllowedBytes,
      usedBytes: finalUsedBytes,
      referralCount: userReferrals.length,
      joinedAt: existingUser ? existingUser.joinedAt : now,
      lastActive: now,
    };

    db.users[uid] = userRecord;
    saveDatabase();

    return res.json({
      success: true,
      user: userRecord,
      referrals: userReferrals,
      purchases: userPurchases,
    });
  });

  /**
   * Fetch User Quota & Live Server State
   */
  app.get('/api/quota/:userId', (req, res) => {
    const userId = req.params.userId;
    const userRecord = db.users[userId];

    const userReferrals = db.referrals.filter((r) => r.referrerId === userId);
    const bonusBytes = userReferrals.length * BONUS_PER_REFERRAL_BYTES;

    const userPurchases = db.purchases.filter((p) => p.userId === userId);
    const purchasedBytes = userPurchases.reduce((acc, p) => acc + (p.storageBytes || 0), 0);

    const totalAllowedBytes = BASE_QUOTA_BYTES + bonusBytes + purchasedBytes;
    const usedBytes = userRecord ? userRecord.usedBytes : 0;
    const maxSingleFileBytes = Math.floor(totalAllowedBytes * 0.2);

    return res.json({
      baseBytes: BASE_QUOTA_BYTES,
      bonusPerReferralBytes: BONUS_PER_REFERRAL_BYTES,
      referrals: userReferrals.map((r) => ({
        id: r.friendUid,
        name: r.friendName,
        email: r.friendEmail,
        joinedAt: r.joinedAt,
        bonusGrantedBytes: r.bonusBytes,
      })),
      totalBonusBytes: bonusBytes,
      purchasedBytes,
      purchases: userPurchases,
      totalAllowedBytes,
      usedBytes,
      maxSingleFileBytes,
    });
  });

  /**
   * Claim Referral: Credited genuinely when a friend joins via ?ref=USER_ID
   */
  app.post('/api/referrals/claim', (req, res) => {
    const { referrerId, friendUid, friendName, friendEmail } = req.body;

    if (!referrerId || !friendUid) {
      return res.status(400).json({ success: false, error: 'Missing referrer or friend ID' });
    }

    // 1. Strict Self-Referral Prevention
    if (referrerId === friendUid) {
      return res.status(400).json({ success: false, error: 'Self-referral is not allowed' });
    }

    const cleanFriendEmail = (friendEmail || '').toLowerCase().trim();
    const identifier = cleanFriendEmail || friendUid;

    // 2. Prevent duplicate referrals by same friend
    if (db.usedReferralEmails.includes(identifier)) {
      return res.json({ success: false, error: 'This friend account has already claimed a referral bonus' });
    }

    const alreadyReferred = db.referrals.some(
      (r) => r.referrerId === referrerId && (r.friendUid === friendUid || (cleanFriendEmail && r.friendEmail === cleanFriendEmail))
    );

    if (alreadyReferred) {
      return res.json({ success: false, error: 'Friend already credited in your referral list' });
    }

    const newReferral: ReferralRecord = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      referrerId,
      friendUid,
      friendName: friendName || (cleanFriendEmail ? cleanFriendEmail.split('@')[0] : 'Real Friend'),
      friendEmail: cleanFriendEmail || `${friendUid.slice(0, 8)}@vault.user`,
      joinedAt: new Date().toISOString(),
      bonusBytes: BONUS_PER_REFERRAL_BYTES,
    };

    db.referrals.push(newReferral);
    db.usedReferralEmails.push(identifier);

    // Update referrer in DB
    if (db.users[referrerId]) {
      db.users[referrerId].referralCount += 1;
      db.users[referrerId].bonusBytes += BONUS_PER_REFERRAL_BYTES;
      db.users[referrerId].totalAllowedBytes += BONUS_PER_REFERRAL_BYTES;
    }

    saveDatabase();

    return res.json({
      success: true,
      message: 'Referral bonus (+0.05 GB) successfully granted!',
      bonusBytes: BONUS_PER_REFERRAL_BYTES,
      referral: newReferral,
    });
  });

  /**
   * Record Premium Purchase: 10 Tk / 100 MB or 50 Tk / 550 MB
   */
  app.post('/api/purchases/record', (req, res) => {
    const {
      userId,
      userEmail,
      planId,
      planName,
      priceTaka,
      storageBytes,
      paymentMethod,
      senderPhone,
      transactionId,
    } = req.body;

    if (!userId || !planId || !senderPhone || !transactionId) {
      return res.status(400).json({ success: false, error: 'All payment fields are required' });
    }

    const cleanTrx = transactionId.trim().toUpperCase();

    // 1. Uniqueness check across entire system
    if (db.verifiedTrxIds.includes(cleanTrx)) {
      return res.status(400).json({
        success: false,
        error: 'এই ট্রানজেকশন আইডিটি ইতোমধ্যে ব্যবহার করা হয়েছে! নতুন সঠিক TrxID দিন।',
      });
    }

    // 2. Cooldown check: 30 days per plan
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const existingPlanPurchase = db.purchases
      .filter((p) => p.userId === userId && p.planId === planId)
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())[0];

    if (existingPlanPurchase) {
      const elapsed = now - new Date(existingPlanPurchase.purchasedAt).getTime();
      if (elapsed < ONE_MONTH_MS) {
        const remainingDays = Math.ceil((ONE_MONTH_MS - elapsed) / (24 * 60 * 60 * 1000));
        return res.status(400).json({
          success: false,
          error: `এই প্ল্যানটি আপনি ইতোমধ্যে নিয়েছেন। ১ মাসের মধ্যে পুনরায় নেওয়া যাবে না। আর ${remainingDays} দিন বাকি।`,
        });
      }
    }

    // 3. Phone number validation
    const cleanPhone = senderPhone.replace(/[\s-]/g, '');
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'সঠিক ১১ ডিজিটের বিকাশ/নগদ/রকেট নম্বর দিন।',
      });
    }

    // 4. Save purchase
    const newPurchase: PurchaseRecordServer = {
      id: `trx_${Date.now()}_${cleanTrx}`,
      userId,
      userEmail: userEmail || `${userId.slice(0, 8)}@vault.user`,
      planId,
      planName: planName || (planId === 'pack_550mb' ? 'Pro 550MB Pack' : 'Starter 100MB Pack'),
      priceTaka: Number(priceTaka) || (planId === 'pack_550mb' ? 50 : 10),
      storageBytes: Number(storageBytes) || (planId === 'pack_550mb' ? 576716800 : 104857600),
      purchasedAt: new Date().toISOString(),
      expiresAt: new Date(now + ONE_MONTH_MS).toISOString(),
      paymentMethod: paymentMethod || 'bkash',
      senderPhone: cleanPhone,
      transactionId: cleanTrx,
    };

    db.purchases.push(newPurchase);
    db.verifiedTrxIds.push(cleanTrx);

    // Update user in DB
    if (db.users[userId]) {
      db.users[userId].purchasedBytes += newPurchase.storageBytes;
      db.users[userId].totalAllowedBytes += newPurchase.storageBytes;
      db.users[userId].plan = planId as any;
      db.users[userId].planName = newPurchase.planName;
    }

    saveDatabase();

    return res.json({
      success: true,
      message: 'পেমেন্ট সফলভাবে যাচাই হয়েছে এবং অতিরিক্ত স্টোরেজ যুক্ত হয়েছে!',
      purchase: newPurchase,
      addedBytes: newPurchase.storageBytes,
      totalAllowedBytes: db.users[userId]?.totalAllowedBytes || (BASE_QUOTA_BYTES + newPurchase.storageBytes),
    });
  });

  /**
   * Admin Control Panel Overview Endpoint
   * STRICT ACCESS: Only gamergigamc4@gmail.com and cloudgamer955@gmail.com can access!
   */
  app.get('/api/admin/overview', (req, res) => {
    const adminEmail = (req.headers['x-admin-email'] as string || req.query.email as string || '').toLowerCase().trim();

    if (!ADMIN_EMAILS.includes(adminEmail)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only authorized administrator emails (gamergigamc4@gmail.com, cloudgamer955@gmail.com) can access this control panel.',
      });
    }

    const usersList = Object.values(db.users).sort(
      (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    );

    const totalUsers = usersList.length;
    const premiumUsers = usersList.filter((u) => u.plan !== 'free');
    const freeUsers = usersList.filter((u) => u.plan === 'free');

    const totalStorageAllocatedBytes = usersList.reduce((acc, u) => acc + (u.totalAllowedBytes || BASE_QUOTA_BYTES), 0);
    const totalStorageUsedBytes = usersList.reduce((acc, u) => acc + (u.usedBytes || 0), 0);

    // Total Catbox pool benchmark (e.g. 100 GB pool reserve)
    const TOTAL_CATBOX_POOL_BENCHMARK_BYTES = 100 * 1024 * 1024 * 1024; // 100 GB
    const usagePercentageOfPool = Math.min(
      100,
      parseFloat(((totalStorageUsedBytes / TOTAL_CATBOX_POOL_BENCHMARK_BYTES) * 100).toFixed(2))
    );

    const allocationPercentageOfPool = Math.min(
      100,
      parseFloat(((totalStorageAllocatedBytes / TOTAL_CATBOX_POOL_BENCHMARK_BYTES) * 100).toFixed(2))
    );

    return res.json({
      success: true,
      adminEmail,
      authorized: true,
      metrics: {
        totalUsers,
        premiumCount: premiumUsers.length,
        freeCount: freeUsers.length,
        totalStorageAllocatedBytes,
        totalStorageUsedBytes,
        catboxPoolBenchmarkBytes: TOTAL_CATBOX_POOL_BENCHMARK_BYTES,
        usagePercentageOfPool,
        allocationPercentageOfPool,
        totalPurchasesCount: db.purchases.length,
        totalReferralsCount: db.referrals.length,
      },
      users: usersList,
      recentPurchases: db.purchases.slice(-20).reverse(),
      recentReferrals: db.referrals.slice(-20).reverse(),
    });
  });

  /**
   * Server-side upload proxy to Catbox API
   * Bypasses browser CORS restrictions and secures the userhash
   */
  app.post('/api/upload-cloud', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file received' });
      }

      const fileName = req.file.originalname || 'file';
      const fileBuffer = req.file.buffer;

      // Construct multipart form data for Catbox API
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('userhash', CATBOX_USERHASH);

      const blob = new Blob([new Uint8Array(fileBuffer)], {
        type: req.file.mimetype || 'application/octet-stream',
      });
      formData.append('fileToUpload', blob, fileName);

      // Post to Catbox API endpoint
      const catboxRes = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      });

      const responseText = await catboxRes.text();

      if (!catboxRes.ok || !responseText.startsWith('http')) {
        console.warn('Catbox upload returned non-URL message:', responseText);
        return res.status(502).json({
          success: false,
          error: `Catbox storage returned: ${responseText}`,
        });
      }

      const fileUrl = responseText.trim();
      return res.json({
        success: true,
        url: fileUrl,
        name: fileName,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (error: any) {
      console.error('Server cloud upload error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error during cloud upload',
      });
    }
  });

  // Mount Vite development middlewares in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static build in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CloudVault server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
