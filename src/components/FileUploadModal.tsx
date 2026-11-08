import React, { useState, useRef } from 'react';
import { UserStorageQuota, Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import { useTranslation } from '../utils/translations';
import { X, UploadCloud, AlertCircle, FileText, CheckCircle2, Gift, ShieldAlert, Sparkles } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  quota: UserStorageQuota;
  onOpenInviteModal: () => void;
  lang: Language;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  quota,
  onOpenInviteModal,
  lang,
}) => {
  const t = useTranslation(lang);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [limitRuleViolated, setLimitRuleViolated] = useState(false);

  if (!isOpen) return null;

  const remainingBytes = Math.max(0, quota.totalAllowedBytes - quota.usedBytes);
  const maxSingleFileBytes = quota.maxSingleFileBytes || Math.floor(quota.totalAllowedBytes * 0.2);

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);
    setLimitRuleViolated(false);

    // Rule 1: Max 20% single file size limit
    // "upload limite storage limit er 20% thakbe jmn 100 mb te 20 mb"
    if (file.size > maxSingleFileBytes) {
      setLimitRuleViolated(true);
      setErrorMessage(
        lang === 'bn'
          ? `ফাইল সাইজ বেশি বড়! নিয়মানুযায়ী আপনার মোট স্টোরেজ (${formatStorageSize(
              quota.totalAllowedBytes
            )}) এর সর্বোচ্চ ২০% অর্থাৎ ${formatStorageSize(
              maxSingleFileBytes
            )} সাইজের ফাইল একবারে আপলোড করতে পারবেন। এই ফাইলটির সাইজ ${formatStorageSize(file.size)}।`
          : `File exceeds single-file limit! Maximum allowed is 20% of your total storage (${formatStorageSize(
              maxSingleFileBytes
            )}). This file is ${formatStorageSize(file.size)}.`
      );
      setSelectedFile(file);
      return;
    }

    // Rule 2: Total storage quota limit
    // "kew jeno tar storage limit er besi upload korte na pare"
    if (file.size + quota.usedBytes > quota.totalAllowedBytes) {
      setLimitRuleViolated(true);
      setErrorMessage(
        lang === 'bn'
          ? `স্টোরেজ লিমিট শেষ! মোট ${formatStorageSize(
              quota.totalAllowedBytes
            )} এর মধ্যে আর মাত্র ${formatStorageSize(remainingBytes)} খালি আছে।`
          : `Storage limit exceeded! You only have ${formatStorageSize(
              remainingBytes
            )} remaining out of ${formatStorageSize(quota.totalAllowedBytes)}.`
      );
      setSelectedFile(file);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile || limitRuleViolated) return;
    try {
      setIsUploading(true);
      setUploadProgress(40);
      await onUpload(selectedFile);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setSelectedFile(null);
        onClose();
      }, 500);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Upload failed');
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setErrorMessage(null);
      setLimitRuleViolated(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{t.uploadBtn}</h2>
              <p className="text-xs text-gray-500">
                {lang === 'bn' ? 'ফাইল নির্বাচন বা ড্র্যাগ করুন' : 'Select or drag your files'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 20% Limit & Remaining Space Rule Badges */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <span className="text-[11px] text-indigo-700 block font-semibold">
              {lang === 'bn' ? 'একক ফাইল লিমিট (২০%)' : 'Max Single File (20%)'}
            </span>
            <span className="text-xs font-black text-indigo-900">
              {formatStorageSize(maxSingleFileBytes)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
            <span className="text-[11px] text-blue-700 block font-semibold">
              {lang === 'bn' ? 'মোট খালি জায়গা' : 'Remaining Space'}
            </span>
            <span className="text-xs font-black text-blue-900">
              {formatStorageSize(remainingBytes)}
            </span>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
              : selectedFile && !limitRuleViolated
              ? 'border-emerald-300 bg-emerald-50/30'
              : limitRuleViolated
              ? 'border-rose-300 bg-rose-50/30'
              : 'border-gray-200 hover:border-blue-400 bg-white hover:bg-gray-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
            className="hidden"
          />

          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-xs sm:text-sm font-bold text-gray-800">{t.dragDropText}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {lang === 'bn'
              ? `সর্বোচ্চ ${formatStorageSize(maxSingleFileBytes)} পর্যন্ত যেকোনো ছবি, ভিডিও বা ফাইল`
              : `Up to ${formatStorageSize(maxSingleFileBytes)} per file`}
          </p>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="mt-3.5 p-3 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-gray-500">
                  {formatStorageSize(selectedFile.size)} • {selectedFile.type || 'file'}
                </p>
              </div>
            </div>

            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setErrorMessage(null);
                  setLimitRuleViolated(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Limit Rule Violation Error Notification */}
        {limitRuleViolated && errorMessage && (
          <div className="mt-3.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-rose-900">
                  {lang === 'bn' ? 'আপলোড লিমিট বা কোটা অতিক্রম!' : 'Upload Rule Exceeded!'}
                </h4>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>{lang === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleStartUpload}
            disabled={!selectedFile || limitRuleViolated || isUploading}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isUploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.uploadBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
