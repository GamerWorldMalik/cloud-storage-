import React, { useState } from 'react';
import { UserStorageQuota, Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import { useTranslation } from '../utils/translations';
import { X, Copy, Check, Users, Gift, Sparkles, ShieldCheck, UserCheck } from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  quota: UserStorageQuota;
  onQuotaUpdated: () => void;
  lang: Language;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  userId,
  quota,
  lang,
}) => {
  const t = useTranslation(lang);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const referralLink = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(
    userId
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Gift className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {lang === 'bn' ? 'আসল বন্ধু ইনভাইট সিস্টেম' : 'Real Friend Referral'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'bn'
                  ? 'বাস্তবে বন্ধু জয়েন করলে প্রতি বন্ধুতে +০.০৫ জিবি স্টোরেজ'
                  : 'Earn +0.05 GB genuine storage when friends join via your link'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Rule Notice */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-purple-50/60 border border-indigo-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <ShieldCheck className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                {lang === 'bn' ? '১০০% বাস্তব ভেরিফিকেশন' : '100% Genuine Verification'}
              </div>
              <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                {lang === 'bn'
                  ? 'কোনো ফেক বা ডামি ডাটা গ্রহণযোগ্য নয়। আপনার বন্ধুরা যখন এই নির্দিষ্ট লিংক দিয়ে সাইন ইন বা একাউন্ট খুলবে, তখন স্বয়ংক্রিয়ভাবে সিস্টেম যাচাই করে আপনার কোটায় +০.০৫ জিবি (৫০ MB) স্পেস যোগ করবে।'
                  : 'Zero mock data. When a real friend registers or logs in via this link, the system verifies and credits +0.05 GB storage to your account.'}
              </p>
            </div>
          </div>
        </div>

        {/* Share Link Box */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            {lang === 'bn' ? 'আপনার ব্যক্তিগত ইনভাইট লিংক:' : 'Your Personal Invite Link:'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-700 select-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white transition-all cursor-pointer shadow-xs ${
                copied
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t.linkCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t.copyLink}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Stats Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-center">
            <div className="text-xs text-gray-500 font-semibold">
              {lang === 'bn' ? 'বাস্তব আমন্ত্রিত বন্ধু' : 'Verified Friends Joined'}
            </div>
            <div className="text-xl font-extrabold text-gray-900 mt-0.5">
              {quota.referrals.length}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-center">
            <div className="text-xs text-gray-500 font-semibold">
              {lang === 'bn' ? 'অর্জিত আসল বোনাস' : 'Verified Storage Earned'}
            </div>
            <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
              +{formatStorageSize(quota.totalBonusBytes)}
            </div>
          </div>
        </div>

        {/* Invited Real Friends List */}
        <div className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span>
              {lang === 'bn'
                ? `যুক্ত হওয়া আসল বন্ধুদের তালিকা (${quota.referrals.length})`
                : `Verified Joined Friends (${quota.referrals.length})`}
            </span>
          </h3>

          {quota.referrals.length === 0 ? (
            <div className="text-center py-8 px-4 bg-gray-50/70 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500">
              <UserCheck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700">
                {lang === 'bn'
                  ? 'এখনও কোনো বন্ধু আপনার লিংকের মাধ্যমে জয়েন করেনি।'
                  : 'No friend has joined using your referral link yet.'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
                {lang === 'bn'
                  ? 'বাস্তবে কোনো বন্ধু এই লিংক দিয়ে একাউন্ট খুললে বা সাইন ইন করলে সাথে সাথে তার আসল নাম ও তথ্য এখানে যুক্ত হবে এবং +০.০৫ জিবি বোনাস পাবেন।'
                  : 'When a real friend registers using your link, their verified details will appear here with +0.05 GB storage.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {quota.referrals.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-200/90 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-2xs">
                      {friend.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">
                        {friend.name}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {friend.email} • {new Date(friend.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    +{formatStorageSize(friend.bonusGrantedBytes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
