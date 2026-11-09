import React, { useState, useEffect } from 'react';
import { Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  Users,
  HardDrive,
  Zap,
  TrendingUp,
  Search,
  RefreshCw,
  Mail,
  Calendar,
  Gift,
  CheckCircle2,
  Clock,
  Layers,
  Percent
} from 'lucide-react';

interface AdminUserRow {
  uid: string;
  email: string;
  displayName: string;
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

interface AdminPurchaseRow {
  id: string;
  userId: string;
  userEmail: string;
  planId: string;
  planName: string;
  priceTaka: number;
  storageBytes: number;
  purchasedAt: string;
  paymentMethod: string;
  senderPhone: string;
  transactionId: string;
}

interface AdminOverviewData {
  success: boolean;
  adminEmail: string;
  authorized: boolean;
  metrics: {
    totalUsers: number;
    premiumCount: number;
    freeCount: number;
    totalStorageAllocatedBytes: number;
    totalStorageUsedBytes: number;
    catboxPoolBenchmarkBytes: number;
    usagePercentageOfPool: number;
    allocationPercentageOfPool: number;
    totalPurchasesCount: number;
    totalReferralsCount: number;
  };
  users: AdminUserRow[];
  recentPurchases: AdminPurchaseRow[];
}

interface AdminControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail: string;
  lang: Language;
}

export const ADMIN_AUTHORIZED_EMAILS = [
  'gamergigamc4@gmail.com',
  'cloudgamer955@gmail.com',
];

export const AdminControlPanelModal: React.FC<AdminControlPanelModalProps> = ({
  isOpen,
  onClose,
  adminEmail,
  lang,
}) => {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'premium' | 'free'>('all');

  const cleanAdminEmail = (adminEmail || '').toLowerCase().trim();
  const isAuthorized = ADMIN_AUTHORIZED_EMAILS.includes(cleanAdminEmail);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/overview?email=${encodeURIComponent(cleanAdminEmail)}`, {
        headers: {
          'x-admin-email': cleanAdminEmail,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(
            lang === 'bn'
              ? 'অ্যাক্সেস নিষিদ্ধ! শুধুমাত্র gamergigamc4@gmail.com এবং cloudgamer955@gmail.com এই প্যানেলে প্রবেশ করতে পারবেন।'
              : 'Access Denied: Only authorized admin emails can view this panel.'
          );
        }
        throw new Error('Failed to fetch admin data');
      }

      const result: AdminOverviewData = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error loading admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthorized) {
      fetchAdminData();
    }
  }, [isOpen, cleanAdminEmail, isAuthorized]);

  if (!isOpen) return null;

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center border border-rose-200 shadow-2xl">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">
            {lang === 'bn' ? 'অ্যাক্সেস অনুমোদিত নয়' : 'Access Restricted'}
          </h3>
          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            {lang === 'bn'
              ? 'এই কন্ট্রোল প্যানেলটি শুধুমাত্র gamergigamc4@gmail.com এবং cloudgamer955@gmail.com এর জন্য সংরক্ষিত।'
              : 'This control panel is strictly restricted to gamergigamc4@gmail.com and cloudgamer955@gmail.com.'}
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {lang === 'bn' ? 'ফিরে যান' : 'Back to Storage'}
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = (data?.users || []).filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (planFilter === 'premium') return u.plan !== 'free';
    if (planFilter === 'free') return u.plan === 'free';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[94vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden font-sans">
        {/* Top Header */}
        <header className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল প্যানেল' : 'Admin Control Panel'}
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Logged in as: <strong className="text-blue-300 font-mono">{cleanAdminEmail}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAdminData}
              disabled={isLoading}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/70">
          {isLoading && !data ? (
            <div className="h-64 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-gray-500">
                {lang === 'bn' ? 'গ্রাহকদের তথ্য লোড হচ্ছে...' : 'Loading customer analytics...'}
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-center">
              <p className="font-bold text-sm mb-1">{error}</p>
              <button
                onClick={fetchAdminData}
                className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Retry
              </button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Top KPI Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Customers */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="flex items-center justify-between text-gray-500 mb-1">
                    <span className="text-xs font-semibold">
                      {lang === 'bn' ? 'মোট গ্রাহক সংখ্যা' : 'Total Customers'}
                    </span>
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 font-mono">
                    {data.metrics.totalUsers}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">{data.metrics.premiumCount} প্রিমিয়াম</span>
                    <span>•</span>
                    <span>{data.metrics.freeCount} ফ্রি</span>
                  </div>
                </div>

                {/* Total Storage Allocated */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="flex items-center justify-between text-gray-500 mb-1">
                    <span className="text-xs font-semibold">
                      {lang === 'bn' ? 'বরাদ্দকৃত মোট স্টোরেজ' : 'Total Quota Granted'}
                    </span>
                    <HardDrive className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 font-mono">
                    {formatStorageSize(data.metrics.totalStorageAllocatedBytes)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {lang === 'bn' ? 'গ্রাহকদের দেয়া সর্বমোট স্টোরেজ' : 'Combined customer capacity'}
                  </div>
                </div>

                {/* Total Storage Used */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="flex items-center justify-between text-gray-500 mb-1">
                    <span className="text-xs font-semibold">
                      {lang === 'bn' ? 'ব্যবহৃত স্টোরেজ' : 'Total Storage Used'}
                    </span>
                    <Layers className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-gray-900 font-mono">
                    {formatStorageSize(data.metrics.totalStorageUsedBytes)}
                  </div>
                  <div className="text-[11px] text-amber-700 mt-1 font-semibold">
                    {data.metrics.totalStorageAllocatedBytes > 0
                      ? `${(
                          (data.metrics.totalStorageUsedBytes / data.metrics.totalStorageAllocatedBytes) *
                          100
                        ).toFixed(1)}% বরাদ্দকৃত কোটার ব্যবহৃত`
                      : '0% ব্যবহৃত'}
                  </div>
                </div>

                {/* Pool Percentage */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="flex items-center justify-between text-gray-500 mb-1">
                    <span className="text-xs font-semibold">
                      {lang === 'bn' ? 'মোট পুল ব্যবহারের শতকরা হার' : 'Pool Usage %'}
                    </span>
                    <Percent className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 font-mono">
                    {data.metrics.usagePercentageOfPool}%
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {formatStorageSize(data.metrics.totalStorageUsedBytes)} / 100 GB পুল
                  </div>
                </div>
              </div>

              {/* Customers Overview Table Section */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {lang === 'bn' ? 'গ্রাহকদের তালিকা ও স্টোরেজ বিস্তারিত' : 'Customers & Storage Directory'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lang === 'bn'
                        ? 'কে কোন প্ল্যানে আছে এবং কার কত স্টোরেজ ব্যবহৃত হয়েছে'
                        : 'View all registered Gmail accounts, active plans, and storage metrics'}
                    </p>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={lang === 'bn' ? 'জিমেইল বা নাম খুঁজুন...' : 'Search Gmail or name...'}
                        className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center p-0.5 bg-gray-100 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setPlanFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          planFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                        }`}
                      >
                        {lang === 'bn' ? 'সকল' : 'All'}
                      </button>
                      <button
                        onClick={() => setPlanFilter('premium')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          planFilter === 'premium' ? 'bg-white text-amber-700 shadow-2xs' : 'text-gray-500'
                        }`}
                      >
                        {lang === 'bn' ? 'প্রিমিয়াম' : 'Premium'}
                      </button>
                      <button
                        onClick={() => setPlanFilter('free')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          planFilter === 'free' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-500'
                        }`}
                      >
                        {lang === 'bn' ? 'ফ্রি' : 'Free'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-3 px-4">{lang === 'bn' ? 'গ্রাহক / জিমেইল' : 'Customer / Gmail'}</th>
                        <th className="py-3 px-4">{lang === 'bn' ? 'প্ল্যান' : 'Plan'}</th>
                        <th className="py-3 px-4">{lang === 'bn' ? 'মোট স্টোরেজ' : 'Total Storage'}</th>
                        <th className="py-3 px-4">{lang === 'bn' ? 'ব্যবহৃত স্টোরেজ' : 'Used Storage'}</th>
                        <th className="py-3 px-4">{lang === 'bn' ? 'রেফারেল' : 'Referrals'}</th>
                        <th className="py-3 px-4">{lang === 'bn' ? 'যোগদানের তারিখ' : 'Joined'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400">
                            {lang === 'bn' ? 'কোনো গ্রাহক পাওয়া যায়নি' : 'No customers matching search'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const userPercent = Math.min(
                            100,
                            Math.round((u.usedBytes / Math.max(1, u.totalAllowedBytes)) * 100)
                          );

                          return (
                            <tr key={u.uid} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                                    {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-gray-900 truncate">
                                      {u.displayName || 'Customer'}
                                    </div>
                                    <div className="text-[11px] text-gray-500 font-mono truncate flex items-center gap-1">
                                      <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span>{u.email}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {u.plan === 'pack_550mb' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                                    <Zap className="w-3 h-3 text-amber-600" />
                                    <span>Pro 550MB (৳৫০)</span>
                                  </span>
                                ) : u.plan === 'pack_100mb' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                                    <Zap className="w-3 h-3 text-blue-600" />
                                    <span>Starter 100MB (৳১০)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-[11px]">
                                    <span>Free 0.25 GB</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 font-mono font-bold text-gray-900">
                                {formatStorageSize(u.totalAllowedBytes)}
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between font-mono text-[11px]">
                                    <span className="font-semibold text-gray-800">
                                      {formatStorageSize(u.usedBytes)}
                                    </span>
                                    <span className="text-gray-400">{userPercent}%</span>
                                  </div>
                                  <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-600 rounded-full"
                                      style={{ width: `${Math.max(userPercent, 3)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 font-mono text-gray-700">
                                <div className="flex items-center gap-1">
                                  <Gift className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{u.referralCount} জন</span>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-gray-500 text-[11px]">
                                {new Date(u.joinedAt).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Payment Transactions Log */}
              {data.recentPurchases && data.recentPurchases.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'bn' ? 'সর্বশেষ ভেরিফাইড পেমেন্ট হিস্ট্রি' : 'Recent Verified Purchases'}</span>
                  </h3>
                  <div className="space-y-2">
                    {data.recentPurchases.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-gray-50 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center font-mono">
                            ৳{p.priceTaka}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              {p.planName} ({formatStorageSize(p.storageBytes)})
                            </div>
                            <div className="text-[11px] text-gray-500">
                              User: {p.userEmail} • Phone: {p.senderPhone}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-blue-600">TrxID: {p.transactionId}</div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(p.purchasedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
