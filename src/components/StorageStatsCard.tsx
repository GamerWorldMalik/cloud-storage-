import React from 'react';
import { UserStorageQuota, Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import { useTranslation } from '../utils/translations';
import {
  HardDrive,
  Gift,
  Users,
  Sparkles,
  Zap,
  Image as ImageIcon,
  Film,
  FileText,
  Music,
  HelpCircle,
} from 'lucide-react';

interface StorageStatsCardProps {
  quota: UserStorageQuota;
  onOpenInviteModal: () => void;
  onOpenUpgradeModal: () => void;
  lang: Language;
}

export const StorageStatsCard: React.FC<StorageStatsCardProps> = ({
  quota,
  onOpenInviteModal,
  onOpenUpgradeModal,
  lang,
}) => {
  const t = useTranslation(lang);
  const percentage = Math.min(
    100,
    Math.round((quota.usedBytes / Math.max(1, quota.totalAllowedBytes)) * 100)
  );

  const remainingBytes = Math.max(0, quota.totalAllowedBytes - quota.usedBytes);
  const isNearLimit = percentage >= 85;
  const breakdown = quota.categoryBreakdown;

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>{lang === 'bn' ? 'স্টোরেজ ব্যবহার ও পরিসংখ্যান' : 'Storage Capacity & Usage'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                {formatStorageSize(quota.totalAllowedBytes)}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              <strong className="text-gray-900 font-semibold">{formatStorageSize(quota.usedBytes)}</strong> {t.usedOf}{' '}
              <strong className="text-gray-900 font-semibold">{formatStorageSize(quota.totalAllowedBytes)}</strong> ({percentage}% পূর্ণ • {formatStorageSize(remainingBytes)} খালি)
            </p>
          </div>
        </div>

        {/* Action Buttons: Upgrade Plan (10Tk/100MB, 50Tk/550MB) and Invite Friends */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenUpgradeModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer group"
          >
            <Zap className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            <span>{lang === 'bn' ? 'স্টোরেজ আপগ্রেড (১০৳/১০০MB)' : 'Upgrade Storage (৳10/100MB)'}</span>
          </button>

          <button
            onClick={onOpenInviteModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
          >
            <Gift className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'bn' ? 'ফ্রি রেফার (+০.০৫ GB)' : 'Referral (+0.05 GB)'}</span>
          </button>
        </div>
      </div>

      {/* Main Storage Bar */}
      <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isNearLimit
              ? 'bg-rose-500'
              : percentage > 70
              ? 'bg-amber-500'
              : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500'
          }`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>

      {/* Breakdown Pills: Exact breakdown of where the storage is allocated */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Base Plan */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{lang === 'bn' ? 'বেস প্ল্যান: ০.২৫ জিবি' : 'Base: 0.25 GB'}</span>
          </div>

          {/* Referral Bonus */}
          {quota.referrals.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                +{formatStorageSize(quota.totalBonusBytes)} ({quota.referrals.length} {lang === 'bn' ? 'বন্ধু' : 'friends'})
              </span>
            </div>
          )}

          {/* Purchased Plan */}
          {quota.purchasedBytes > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>+{formatStorageSize(quota.purchasedBytes)} {lang === 'bn' ? 'আপগ্রেড প্যাক' : 'Upgraded'}</span>
            </div>
          )}
        </div>

        {/* Category Breakdown (images, videos, docs, audio) */}
        {breakdown && quota.usedBytes > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
            {breakdown.images > 0 && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                <ImageIcon className="w-3 h-3" />
                {formatStorageSize(breakdown.images)}
              </span>
            )}
            {breakdown.videos > 0 && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md">
                <Film className="w-3 h-3" />
                {formatStorageSize(breakdown.videos)}
              </span>
            )}
            {breakdown.documents > 0 && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                <FileText className="w-3 h-3" />
                {formatStorageSize(breakdown.documents)}
              </span>
            )}
            {breakdown.audio > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md">
                <Music className="w-3 h-3" />
                {formatStorageSize(breakdown.audio)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
