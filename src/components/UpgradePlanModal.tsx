import React, { useState } from 'react';
import { UserStorageQuota, UpgradePlan, Language } from '../types/storage';
import {
  STORAGE_PLANS,
  PAYMENT_NUMBERS,
  verifyAndApplyPayment,
  isPlanOnCooldown,
  formatStorageSize,
} from '../services/storageQuotaService';
import { useTranslation } from '../utils/translations';
import {
  X,
  Zap,
  Check,
  ShieldCheck,
  Sparkles,
  CreditCard,
  AlertCircle,
  Copy,
  Clock,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  quota: UserStorageQuota;
  onQuotaUpdated: () => void;
  lang: Language;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  userId,
  quota,
  onQuotaUpdated,
  lang,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan>(STORAGE_PLANS[0]);
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);

  if (!isOpen) return null;

  const currentNumber = PAYMENT_NUMBERS[paymentMethod];
  const cooldownInfo = isPlanOnCooldown(userId, selectedPlan.id);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(currentNumber.replace(/-/g, ''));
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (cooldownInfo.onCooldown) {
      setErrorMessage(
        lang === 'bn'
          ? `এই প্ল্যানটি ইতোমধ্যে নেওয়া হয়েছে। ১ মাসের মধ্যে পুনরায় নেওয়া যাবে না। আর ${cooldownInfo.remainingDays} দিন বাকি।`
          : `Plan is on 30-day cooldown. Next purchase available in ${cooldownInfo.remainingDays} days.`
      );
      return;
    }

    if (!senderPhone.trim() || !transactionId.trim()) {
      setErrorMessage(
        lang === 'bn'
          ? 'অনুগ্রহ করে আপনার প্রেরক নম্বর এবং TrxID প্রদান করুন।'
          : 'Please enter your sender phone number and TrxID.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      const result = await verifyAndApplyPayment(
        userId,
        selectedPlan,
        paymentMethod,
        senderPhone,
        transactionId
      );

      setIsProcessing(false);

      if (!result.success) {
        setErrorMessage(result.error || 'পেমেন্ট যাচাইকরণ ব্যর্থ হয়েছে। সঠিক তথ্য দিন।');
        return;
      }

      setSuccessMessage(
        lang === 'bn'
          ? `পেমেন্ট সফলভাবে যাচাই হয়েছে! আপনার একাউন্টে +${selectedPlan.storageLabel} স্টোরেজ যোগ করা হয়েছে (১ মাস মেয়াদী)।`
          : `Payment verified! Added +${selectedPlan.storageLabel} storage to your account.`
      );

      onQuotaUpdated();

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      // Clear fields
      setSenderPhone('');
      setTransactionId('');
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment processing failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {lang === 'bn' ? 'আসল স্টোরেজ আপগ্রেড' : 'Verified Storage Upgrade'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'bn'
                  ? '১০ টাকায় ১০০ MB ও ৫০ টাকায় ৫৫০ MB (মাসে ১ বার)'
                  : 'Real payment verified • 1 purchase per month rule'}
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

        {/* Current storage info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-500 block">
              {lang === 'bn' ? 'বর্তমান মোট স্টোরেজ' : 'Total Storage'}
            </span>
            <span className="font-bold text-gray-900 text-sm">
              {formatStorageSize(quota.totalAllowedBytes)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-gray-500 block">
              {lang === 'bn' ? 'একক ফাইল লিমিট (২০%)' : 'Single File Max (20%)'}
            </span>
            <span className="font-bold text-indigo-600 text-sm">
              {formatStorageSize(quota.maxSingleFileBytes)}
            </span>
          </div>
        </div>

        {/* Plans Selection */}
        <div className="mt-4 space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            {lang === 'bn' ? 'প্ল্যান নির্বাচন করুন:' : 'Select Plan:'}
          </label>

          {STORAGE_PLANS.map((plan) => {
            const isSelected = selectedPlan.id === plan.id;
            const planCooldown = isPlanOnCooldown(userId, plan.id);

            return (
              <div
                key={plan.id}
                onClick={() => {
                  setErrorMessage(null);
                  setSelectedPlan(plan);
                }}
                className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                } ${planCooldown.onCooldown ? 'opacity-75' : ''}`}
              >
                {planCooldown.onCooldown ? (
                  <span className="absolute -top-2.5 right-4 bg-gray-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-300" />
                    <span>
                      {lang === 'bn'
                        ? `১ মাস লক (আর ${planCooldown.remainingDays} দিন)`
                        : `Locked (${planCooldown.remainingDays}d left)`}
                    </span>
                  </span>
                ) : (
                  plan.popular && (
                    <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs uppercase">
                      {lang === 'bn' ? 'সেরা অফার' : 'Best Offer'}
                    </span>
                  )
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <span>+{plan.storageLabel}</span>
                      <span className="text-xs font-normal text-gray-500">
                        ({formatStorageSize(plan.storageBytes)})
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">{plan.description}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-blue-600">
                    ৳{plan.priceTaka}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real Payment Instructions & Form */}
        <form onSubmit={handleVerifyPayment} className="mt-4 pt-3 border-t border-gray-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            {lang === 'bn' ? 'পেমেন্ট মেথড ও নিয়ম:' : 'Payment Method:'}
          </label>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['bkash', 'nagad', 'rocket'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer uppercase ${
                  paymentMethod === method
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Real Payment Instructions Card */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 mb-3 space-y-1.5">
            <div className="font-bold flex items-center justify-between">
              <span>
                {lang === 'bn'
                  ? `${paymentMethod.toUpperCase()} সেন্ড মানি করুন (Send Money):`
                  : `Send Money via ${paymentMethod.toUpperCase()}:`}
              </span>
              <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                ৳{selectedPlan.priceTaka}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-amber-200">
              <span className="font-mono font-bold text-gray-900 text-sm">{currentNumber}</span>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
              >
                {copiedNumber ? 'কপি হয়েছে' : 'নম্বর কপি'}
              </button>
            </div>
            <p className="text-[11px] text-amber-800">
              {lang === 'bn'
                ? `টাকা পাঠানোর পর প্রাপ্ত ট্রানজেকশন আইডি (TrxID) ও আপনার নম্বর নিচে দিয়ে ভেরিফাই করুন।`
                : `After sending money, enter your phone number and TrxID below to verify.`}
            </p>
          </div>

          {/* Inputs for Sender Phone & TrxID */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                {lang === 'bn' ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন (Sender Phone):' : 'Sender Phone Number:'}
              </label>
              <input
                type="text"
                required
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                {lang === 'bn' ? 'ট্রানজেকশন আইডি (TrxID):' : 'Transaction ID (TrxID):'}
              </label>
              <input
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. BL97XKQ81M"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Errors or Success */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-5 flex items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-gray-400">
              {lang === 'bn' ? '১০০% আসল ভেরিফিকেশন' : 'Verified Payment'}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isProcessing || cooldownInfo.onCooldown}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'যাচাই হচ্ছে...'
                    : lang === 'bn'
                    ? `৳${selectedPlan.priceTaka} পেমেন্ট ভেরিফাই করুন`
                    : `Verify ৳${selectedPlan.priceTaka} Payment`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
