import React, { useState, useEffect } from 'react';
import { CloudFile, Language } from '../types/storage';
import { useTranslation } from '../utils/translations';
import { X, Edit3, Check } from 'lucide-react';

interface RenameFileModalProps {
  isOpen: boolean;
  file: CloudFile | null;
  onClose: () => void;
  onRename: (fileId: string, newName: string) => Promise<void>;
  lang: Language;
}

export const RenameFileModal: React.FC<RenameFileModalProps> = ({
  isOpen,
  file,
  onClose,
  onRename,
  lang,
}) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (file) {
      setName(file.name);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onRename(file.id, name.trim());
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              {lang === 'bn' ? 'ফাইলের নাম পরিবর্তন' : 'Rename File'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            {lang === 'bn' ? 'নতুন ফাইলের নাম' : 'New File Name'}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            autoFocus
          />

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
