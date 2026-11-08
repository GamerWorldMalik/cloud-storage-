import React from 'react';
import { CloudFile, Language } from '../types/storage';
import { useTranslation } from '../utils/translations';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { formatStorageSize } from '../services/storageQuotaService';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  file: CloudFile | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  lang: Language;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  file,
  onConfirm,
  onCancel,
  isDeleting,
  lang,
}) => {
  const t = useTranslation(lang);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {t.deleteConfirmTitle}
            </h3>
            <p className="text-xs text-gray-500">
              {file.name} ({formatStorageSize(file.size)})
            </p>
          </div>
        </div>

        <div className="mt-4 p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 text-xs text-rose-800 leading-relaxed">
          {t.deleteConfirmMsg}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : t.delete}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
