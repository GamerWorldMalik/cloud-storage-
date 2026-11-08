import React, { useState } from 'react';
import { CloudFile, Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import { useTranslation } from '../utils/translations';
import { X, Share2, Copy, Check, Link2, Globe, ShieldCheck } from 'lucide-react';
import { getFileIcon } from './FileList';

interface ShareFileModalProps {
  isOpen: boolean;
  file: CloudFile | null;
  onClose: () => void;
  lang: Language;
}

export const ShareFileModal: React.FC<ShareFileModalProps> = ({
  isOpen,
  file,
  onClose,
  lang,
}) => {
  const t = useTranslation(lang);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !file) return null;

  const shareableUrl = `${window.location.origin}${window.location.pathname}?file=${encodeURIComponent(
    file.id
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {lang === 'bn' ? 'ফাইল শেয়ার করুন' : 'Share File'}
              </h3>
              <p className="text-xs text-gray-400">
                {file.name} ({formatStorageSize(file.size)})
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

        {/* File Card */}
        <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-2xs flex items-center justify-center shrink-0">
            {getFileIcon(file.mimeType, file.fileExtension)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-900 truncate" title={file.name}>
              {file.name}
            </p>
            <p className="text-[11px] text-gray-500">
              {formatStorageSize(file.size)} • {file.fileExtension ? file.fileExtension.toUpperCase() : 'FILE'}
            </p>
          </div>
        </div>

        {/* Share Link Input */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-gray-400" />
            <span>{lang === 'bn' ? 'শেয়ারেবল লিংক:' : 'Shareable Link:'}</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareableUrl}
              className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-700 select-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-white transition-all cursor-pointer ${
                copied ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'কপি' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Permission Info */}
        <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-800">
          <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {lang === 'bn'
              ? 'যেকোনো ব্যক্তি এই লিংকের মাধ্যমে ফাইলটি দেখতে এবং ডাউনলোড করতে পারবে।'
              : 'Anyone with this link can view and download this file.'}
          </span>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'ঠিক আছে' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
