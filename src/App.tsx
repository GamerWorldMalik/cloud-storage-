import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  initAuth,
  googleSignIn,
  emailSignIn,
  emailSignUp,
  logout,
} from './firebase/auth';
import {
  AuthUser,
  CloudFile,
  FileCategory,
  Language,
  ViewMode,
  SortOption,
  UserStorageQuota,
} from './types/storage';
import {
  calculateUserQuota,
  BASE_QUOTA_BYTES,
  BONUS_PER_REFERRAL_BYTES,
  recordGenuineReferral,
  formatStorageSize,
  fetchLiveUserQuota,
  syncUserToServer,
} from './services/storageQuotaService';
import {
  openCloudDB,
  savePermanentFile,
  loadPermanentUserFiles,
  getPermanentFileBlob,
  deletePermanentFile,
  renamePermanentFile,
  togglePermanentStar,
  getStoredUser,
  setStoredUser,
} from './services/persistentStorage';
import { useTranslation } from './utils/translations';

// Components
import { Navbar } from './components/Navbar';
import { StorageStatsCard } from './components/StorageStatsCard';
import { FileList } from './components/FileList';
import { FileUploadModal } from './components/FileUploadModal';
import { ReferralModal } from './components/ReferralModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { SignInPrompt } from './components/SignInPrompt';
import { UpgradePlanModal } from './components/UpgradePlanModal';
import { ShareFileModal } from './components/ShareFileModal';
import { RenameFileModal } from './components/RenameFileModal';
import { PublicFileViewer } from './components/PublicFileViewer';
import { AdminControlPanelModal, ADMIN_AUTHORIZED_EMAILS } from './components/AdminControlPanelModal';

import {
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  Folder,
  Image as ImageIcon,
  FileText,
  Film,
  Archive,
  Star,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [lang, setLang] = useState<Language>('bn');
  const t = useTranslation(lang);

  // Check if visitor is opening a shared file link (?file=FILE_ID) - NO LOGIN REQUIRED!
  const [publicSharedFileId, setPublicSharedFileId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('file');
  });

  // Persistent User Session: Immediate restore from localStorage
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getStoredUser());
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Files State
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Quota
  const [quota, setQuota] = useState<UserStorageQuota>(() =>
    user
      ? calculateUserQuota(user.uid, [])
      : {
          baseBytes: BASE_QUOTA_BYTES,
          bonusPerReferralBytes: BONUS_PER_REFERRAL_BYTES,
          referrals: [],
          totalBonusBytes: 0,
          purchasedBytes: 0,
          purchases: [],
          totalAllowedBytes: BASE_QUOTA_BYTES,
          usedBytes: 0,
          maxSingleFileBytes: Math.floor(BASE_QUOTA_BYTES * 0.2),
        }
  );

  // UI Navigation & Filters
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<CloudFile | null>(null);
  const [shareCandidate, setShareCandidate] = useState<CloudFile | null>(null);
  const [renameCandidate, setRenameCandidate] = useState<CloudFile | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CloudFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Referral tracking on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      sessionStorage.setItem('cloudvault_referrer', refCode);
    }
  }, []);

  // Keep stable refs to avoid recreating callbacks or re-triggering effects
  const filesRef = useRef(files);
  filesRef.current = files;

  // Update Quota for user with live server sync (stable callback, does not recreate on user identity change)
  const updateQuotaForUser = useCallback(async (userId: string, currentFiles: CloudFile[]) => {
    const updated = await fetchLiveUserQuota(userId, currentFiles);
    setQuota(updated);
    const stored = getStoredUser();
    if (stored) {
      syncUserToServer(stored.uid, stored.email, stored.displayName, stored.photoURL, updated.usedBytes);
    }
  }, []);

  // Permanent load files for user
  const loadFiles = useCallback(async (currentUserId: string) => {
    setIsLoadingFiles(true);
    try {
      const userFiles = await loadPermanentUserFiles(currentUserId);
      setFiles(userFiles);
      await updateQuotaForUser(currentUserId, userFiles);
    } catch (err) {
      console.error('Error loading files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [updateQuotaForUser]);

  const loadFilesRef = useRef(loadFiles);
  loadFilesRef.current = loadFiles;

  // Process genuine referral if a friend visited via a referral link
  const processReferral = useCallback(async (newUserId: string, newUserName: string, newUserEmail: string) => {
    const referrerId = sessionStorage.getItem('cloudvault_referrer');
    if (referrerId && referrerId !== newUserId) {
      const res = await recordGenuineReferral(referrerId, newUserId, newUserName, newUserEmail);
      if (res.success) {
        sessionStorage.removeItem('cloudvault_referrer');
      }
    }
  }, []);

  const processReferralRef = useRef(processReferral);
  processReferralRef.current = processReferral;

  // Initial load if user is stored (only runs when the actual user ID changes, NOT on every render)
  const lastLoadedUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (user?.uid && lastLoadedUidRef.current !== user.uid) {
      lastLoadedUidRef.current = user.uid;
      loadFilesRef.current(user.uid);
    }
  }, [user?.uid]);

  // Listen for real-time referral and purchase updates
  useEffect(() => {
    const handleSync = () => {
      const stored = getStoredUser();
      if (stored?.uid) {
        updateQuotaForUser(stored.uid, filesRef.current);
      }
    };

    window.addEventListener('cloudvault_referral_update', handleSync);
    window.addEventListener('cloudvault_purchase_update', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('cloudvault_referral_update', handleSync);
      window.removeEventListener('cloudvault_purchase_update', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [updateQuotaForUser]);

  // Auth Initialization Listener: Attached ONCE on mount with []
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser((prev) => {
          if (
            prev?.uid === currentUser.uid &&
            prev?.email === currentUser.email &&
            prev?.displayName === currentUser.displayName
          ) {
            return prev;
          }
          return currentUser;
        });
        setStoredUser(currentUser);
        setNeedsAuth(false);
        loadFilesRef.current(currentUser.uid);
        processReferralRef.current(
          currentUser.uid,
          currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Real Friend'),
          currentUser.email || ''
        );
      },
      () => {
        if (!getStoredUser()) {
          setNeedsAuth(true);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Google Sign In (NO test permissions needed!)
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setStoredUser(result.user);
        setNeedsAuth(false);
        await loadFiles(result.user.uid);
        processReferral(
          result.user.uid,
          result.user.displayName || (result.user.email ? result.user.email.split('@')[0] : 'Real Friend'),
          result.user.email || ''
        );

        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        alert(err.message || 'Login failed');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Email Sign In
  const handleEmailLogin = async (email: string, pass: string) => {
    const result = await emailSignIn(email, pass);
    setUser(result.user);
    setStoredUser(result.user);
    setNeedsAuth(false);
    await loadFiles(result.user.uid);
    processReferral(result.user.uid, result.user.displayName || email.split('@')[0], email);

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Email Sign Up
  const handleEmailSignUp = async (name: string, email: string, pass: string) => {
    const result = await emailSignUp(name, email, pass);
    setUser(result.user);
    setStoredUser(result.user);
    setNeedsAuth(false);
    await loadFiles(result.user.uid);
    processReferral(result.user.uid, name || email.split('@')[0], email);

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Sign Out
  const handleLogout = async () => {
    await logout();
    setStoredUser(null);
    setUser(null);
    setFiles([]);
    setNeedsAuth(true);
  };

  // Permanent File Upload (preserves exact name, e.g. mojo.txt)
  const handleUpload = async (file: File) => {
    if (!user) throw new Error('Not authenticated');

    // Rule 1: Single file upload limit = exactly 20% of total storage capacity
    // "upload limite storage limit er 20% thakbe jmn 100 mb te 20 mb"
    const maxSingleBytes = quota.maxSingleFileBytes || Math.floor(quota.totalAllowedBytes * 0.2);
    if (file.size > maxSingleBytes) {
      throw new Error(
        lang === 'bn'
          ? `ফাইল সাইজ বেশি বড়! নিয়মানুযায়ী আপনার মোট স্টোরেজের সর্বোচ্চ ২০% (${formatStorageSize(
              maxSingleBytes
            )}) সাইজের ফাইল একবারে আপলোড করতে পারবেন।`
          : `File exceeds 20% single-file upload limit of ${formatStorageSize(maxSingleBytes)}.`
      );
    }

    // Rule 2: Total storage quota check
    // "kew jeno tar storage limit er besi upload korte na pare"
    if (file.size + quota.usedBytes > quota.totalAllowedBytes) {
      throw new Error(
        lang === 'bn'
          ? `স্টোরেজ লিমিট পূর্ণ! আপনার মোট ${formatStorageSize(
              quota.totalAllowedBytes
            )} এর মধ্যে আর মাত্র ${formatStorageSize(
              Math.max(0, quota.totalAllowedBytes - quota.usedBytes)
            )} খালি আছে।`
          : `Storage quota exceeded!`
      );
    }

    const createdRecord = await savePermanentFile(user.uid, file);
    const updated = [createdRecord, ...files];
    setFiles(updated);
    updateQuotaForUser(user.uid, updated);
  };

  // Permanent File Delete
  const handleConfirmDelete = async () => {
    if (!deleteCandidate || !user) return;
    setIsDeleting(true);
    try {
      await deletePermanentFile(user.uid, deleteCandidate.id);

      const updated = files.filter((f) => f.id !== deleteCandidate.id);
      setFiles(updated);
      updateQuotaForUser(user.uid, updated);

      if (previewFile?.id === deleteCandidate.id) {
        setPreviewFile(null);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(`Could not delete file: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteCandidate(null);
    }
  };

  // Permanent File Rename
  const handleRename = async (fileId: string, newName: string) => {
    if (!user) return;
    await renamePermanentFile(user.uid, fileId, newName);

    const updated = files.map((f) =>
      f.id === fileId ? { ...f, name: newName, modifiedTime: new Date().toISOString() } : f
    );
    setFiles(updated);

    if (previewFile?.id === fileId) {
      setPreviewFile({ ...previewFile, name: newName });
    }
  };

  // Permanent Toggle Star
  const handleToggleStar = async (file: CloudFile) => {
    if (!user) return;
    const newStatus = !file.isStarred;
    await togglePermanentStar(user.uid, file.id, newStatus);

    const updated = files.map((f) => (f.id === file.id ? { ...f, isStarred: newStatus } : f));
    setFiles(updated);
  };

  // Permanent File Download (Exact filename)
  const handleDownload = async (file: CloudFile) => {
    try {
      const blob = await getPermanentFileBlob(file);
      if (!blob) throw new Error('File data not found');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name; // Exactly mojo.txt or original name
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Could not download file');
    }
  };

  // Filtered & Sorted files
  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        if (searchQuery.trim()) {
          const match = file.name.toLowerCase().includes(searchQuery.toLowerCase());
          if (!match) return false;
        }

        const ext = (file.fileExtension || '').toLowerCase();
        const mime = (file.mimeType || '').toLowerCase();

        if (selectedCategory === 'all') return true;
        if (selectedCategory === 'starred') return !!file.isStarred;
        if (selectedCategory === 'images')
          return mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
        if (selectedCategory === 'media')
          return (
            mime.startsWith('video/') ||
            mime.startsWith('audio/') ||
            ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'ogg'].includes(ext)
          );
        if (selectedCategory === 'documents')
          return (
            mime.includes('pdf') ||
            mime.includes('document') ||
            mime.includes('text') ||
            mime.includes('sheet') ||
            ['pdf', 'txt', 'doc', 'docx', 'csv', 'xlsx', 'ppt', 'pptx'].includes(ext)
          );
        if (selectedCategory === 'archives')
          return (
            mime.includes('zip') ||
            mime.includes('compressed') ||
            mime.includes('tar') ||
            mime.includes('rar') ||
            ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)
          );
        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'date-desc')
          return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
        if (sortOption === 'date-asc')
          return new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        if (sortOption === 'size-desc') return (b.size || 0) - (a.size || 0);
        if (sortOption === 'size-asc') return (a.size || 0) - (b.size || 0);
        return 0;
      });
  }, [files, searchQuery, selectedCategory, sortOption]);

  const categories = [
    { id: 'all', label: t.allFiles, icon: Folder },
    { id: 'images', label: t.images, icon: ImageIcon },
    { id: 'documents', label: t.documents, icon: FileText },
    { id: 'media', label: t.media, icon: Film },
    { id: 'archives', label: t.archives, icon: Archive },
    { id: 'starred', label: t.starred, icon: Star },
  ];

  // 1. PUBLIC SHARED FILE VIEW (NO LOGIN REQUIRED)
  if (publicSharedFileId) {
    return (
      <PublicFileViewer
        fileId={publicSharedFileId}
        onGoToApp={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setPublicSharedFileId(null);
        }}
        lang={lang}
      />
    );
  }

  // 2. MAIN APP
  return (
    <div className="min-h-screen bg-gray-50/60 text-gray-900 flex flex-col font-sans selection:bg-blue-100">
      {/* Top Navbar */}
      <Navbar
        user={user}
        quota={quota}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        onOpenAdminPanel={() => setIsAdminModalOpen(true)}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'bn' ? 'en' : 'bn'))}
      />

      {/* Main Content */}
      {needsAuth || !user ? (
        <SignInPrompt
          onGoogleLogin={handleGoogleLogin}
          onEmailLogin={handleEmailLogin}
          onEmailSignUp={handleEmailSignUp}
          isLoading={isLoggingIn}
          lang={lang}
        />
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Admin Quick Launch Banner for authorized admins */}
          {user?.email && ADMIN_AUTHORIZED_EMAILS.includes(user.email.toLowerCase().trim()) && (
            <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 border border-amber-400/30 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300">
                      {lang === 'bn' ? 'অ্যাডমিন এক্সেস সক্রিয়' : 'Admin Mode Active'}
                    </span>
                    <span className="text-[10px] bg-amber-400/10 text-amber-200 px-2 py-0.5 rounded-full font-mono">
                      {user.email}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    {lang === 'bn'
                      ? 'সকল গ্রাহকদের জিমেইল, প্রিমিয়াম/ফ্রি স্টোরেজ ব্যবহার এবং মোট পুল স্টোরেজের হিসাব দেখতে কন্ট্রোল প্যানেল খুলুন।'
                      : 'View customer accounts, storage allocations, and pool capacity in the control panel.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-black text-xs shadow-sm transition-all cursor-pointer shrink-0"
              >
                {lang === 'bn' ? 'কন্ট্রোল প্যানেল খুলুন' : 'Open Control Panel'}
              </button>
            </div>
          )}

          {/* Storage Quota Card (Exact MB/GB, 20% limit indicator, Category Breakdown, Upgrade CTA) */}
          <StorageStatsCard
            quota={quota}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
            onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
            lang={lang}
          />

          {/* Action Row & Category Pills */}
          <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as FileCategory)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5 self-end lg:self-auto">
              <button
                onClick={() => user && loadFiles(user.uid)}
                disabled={isLoadingFiles}
                title={t.refresh}
                className="p-2 bg-white border border-gray-200/80 text-gray-600 hover:text-blue-600 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin text-blue-600' : ''}`}
                />
              </button>

              <div className="flex items-center bg-white border border-gray-200/80 rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-gray-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={t.gridView}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-gray-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={t.listView}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.uploadBtn}</span>
              </button>
            </div>
          </div>

          {/* Files List/Grid */}
          {isLoadingFiles && files.length === 0 ? (
            <div className="text-center py-20">
              <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
              <p className="text-xs text-gray-500">{t.loadingFiles}</p>
            </div>
          ) : (
            <FileList
              files={filteredFiles}
              viewMode={viewMode}
              onPreview={(f) => setPreviewFile(f)}
              onDownload={handleDownload}
              onDeleteRequest={(f) => setDeleteCandidate(f)}
              onToggleStar={handleToggleStar}
              onShare={(f) => setShareCandidate(f)}
              onRename={(f) => setRenameCandidate(f)}
              lang={lang}
            />
          )}
        </main>
      )}

      {/* Upload Modal (Strict 20% limit & quota limit enforced) */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        quota={quota}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        lang={lang}
      />

      {/* Real Referral & Invite Friends Modal */}
      {user && (
        <ReferralModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          userId={user.uid}
          quota={quota}
          onQuotaUpdated={() => updateQuotaForUser(user.uid, files)}
          lang={lang}
        />
      )}

      {/* Real Storage Upgrade Modal (10 Tk = 100MB, 50 Tk = 550MB, 1 month lock) */}
      {user && (
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          userId={user.uid}
          quota={quota}
          onQuotaUpdated={() => updateQuotaForUser(user.uid, files)}
          lang={lang}
        />
      )}

      {/* Share File Modal */}
      <ShareFileModal
        isOpen={!!shareCandidate}
        file={shareCandidate}
        onClose={() => setShareCandidate(null)}
        lang={lang}
      />

      {/* Rename File Modal */}
      <RenameFileModal
        isOpen={!!renameCandidate}
        file={renameCandidate}
        onClose={() => setRenameCandidate(null)}
        onRename={handleRename}
        lang={lang}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteCandidate}
        file={deleteCandidate}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
        isDeleting={isDeleting}
        lang={lang}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => {
          if (previewFile?.blobUrl) {
            URL.revokeObjectURL(previewFile.blobUrl);
          }
          setPreviewFile(null);
        }}
        onDownload={handleDownload}
        onDeleteRequest={(f) => setDeleteCandidate(f)}
        onShare={(f) => setShareCandidate(f)}
        onRename={(f) => setRenameCandidate(f)}
        lang={lang}
      />

      {/* Admin Control Panel Modal (Strictly restricted to gamergigamc4@gmail.com and cloudgamer955@gmail.com) */}
      <AdminControlPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        adminEmail={user?.email || ''}
        lang={lang}
      />
    </div>
  );
}
