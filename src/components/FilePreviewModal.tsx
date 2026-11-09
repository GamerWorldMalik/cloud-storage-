import React, { useState, useEffect } from 'react';
import { CloudFile, Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import { getPermanentFileBlob } from '../services/persistentStorage';
import { useTranslation } from '../utils/translations';
import {
  X,
  Download,
  Trash2,
  Calendar,
  FileText,
  HardDrive,
  Share2,
  Edit3,
  Copy,
  Check,
  Play,
  ExternalLink,
  Globe
} from 'lucide-react';
import { getFileIcon, getExtensionBadge } from './FileList';

interface FilePreviewModalProps {
  file: CloudFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: CloudFile) => void;
  onDeleteRequest: (file: CloudFile) => void;
  onShare: (file: CloudFile) => void;
  onRename: (file: CloudFile) => void;
  lang: Language;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onDownload,
  onDeleteRequest,
  onShare,
  onRename,
  lang,
}) => {
  const t = useTranslation(lang);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (file) {
      if (file.textContent) {
        setTextContent(file.textContent);
      } else {
        setTextContent('');
      }

      if (file.dataUrl) {
        setBlobUrl(file.dataUrl);
      } else {
        getPermanentFileBlob(file).then((blob) => {
          if (!active || !blob) return;
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);

          // If text file and no cached text, read text
          const ext = (file.fileExtension || '').toLowerCase();
          if (file.mimeType.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts', 'html'].includes(ext)) {
            blob.text().then((txt) => {
              if (active) setTextContent(txt);
            });
          }
        });
      }
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file]);

  if (!isOpen || !file) return null;

  const ext = (file.fileExtension || '').toLowerCase();
  const isImage =
    file.mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const isVideo =
    file.mimeType.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv'].includes(ext);
  const isAudio =
    file.mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
  const isText =
    file.mimeType.startsWith('text/') ||
    ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'py'].includes(ext);

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
        {/* Header: Exact File Name (e.g. mojo.txt) */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              {getFileIcon(file.mimeType, file.fileExtension)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 truncate" title={file.name}>
                  {file.name}
                </h3>
                {getExtensionBadge(file.name, file.fileExtension)}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatStorageSize(file.size)} • {new Date(file.modifiedTime).toLocaleString()}
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

        {/* Content Viewer (Image, Video, Audio, or Text like mojo.txt) */}
        <div className="flex-1 my-4 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden min-h-[240px] max-h-[420px] border border-gray-200/80 p-3 relative">
          {isImage ? (
            <img
              src={blobUrl || file.cloudUrl || file.dataUrl || ''}
              alt={file.name}
              className="max-h-[380px] max-w-full object-contain rounded-xl shadow-xs"
            />
          ) : isVideo && (blobUrl || file.cloudUrl) ? (
            <video
              src={blobUrl || file.cloudUrl}
              controls
              autoPlay={false}
              className="max-h-[380px] max-w-full rounded-xl shadow-xs"
            />
          ) : isAudio && (blobUrl || file.cloudUrl) ? (
            <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xs border border-gray-200 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                {getFileIcon(file.mimeType, file.fileExtension)}
              </div>
              <p className="text-xs font-bold text-gray-900 mb-3">{file.name}</p>
              <audio src={blobUrl || file.cloudUrl} controls className="w-full" />
            </div>
          ) : isText ? (
            <div className="w-full h-full max-h-[380px] bg-white rounded-xl border border-gray-200 p-4 font-mono text-xs text-gray-800 overflow-y-auto relative text-left">
              <div className="sticky top-0 bg-white/90 backdrop-blur-xs pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  {file.name} - Text Content Preview
                </span>
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed select-text font-sans">
                {textContent || 'Loading content...'}
              </pre>
            </div>
          ) : (
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-white shadow-xs border border-gray-200 flex items-center justify-center mb-3">
                {getFileIcon(file.mimeType, file.fileExtension)}
              </div>
              <p className="text-xs font-bold text-gray-900">{file.name}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                {formatStorageSize(file.size)} • {file.mimeType}
              </p>
            </div>
          )}
        </div>

        {/* Metadata info */}
        <div className="grid grid-cols-3 gap-2.5 text-xs text-gray-600 py-2.5 border-t border-gray-100 bg-gray-50/70 rounded-xl px-3 mb-4">
          <div>
            <span className="text-[10px] text-gray-400 block">{lang === 'bn' ? 'ফাইলের আকার' : 'File Size'}</span>
            <span className="font-bold text-gray-800">{formatStorageSize(file.size)}</span>
          </div>

          <div>
            <span className="text-[10px] text-gray-400 block">{lang === 'bn' ? 'আপলোড তারিখ' : 'Modified'}</span>
            <span className="font-semibold text-gray-800">
              {new Date(file.modifiedTime).toLocaleDateString()}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-gray-400 block">Status</span>
            {file.cloudUrl ? (
              <a
                href={file.cloudUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                title={file.cloudUrl}
              >
                <span>Catbox Cloud</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="font-bold text-emerald-600">Saved in Vault</span>
            )}
          </div>
        </div>

        {/* Drive Action Buttons: Share, Rename, Download, Delete */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <button
            onClick={() => {
              onClose();
              onDeleteRequest(file);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.delete}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onRename(file);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-gray-500" />
              <span>{lang === 'bn' ? 'নাম পরিবর্তন' : 'Rename'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onShare(file);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'bn' ? 'শেয়ার' : 'Share'}</span>
            </button>

            <button
              onClick={() => onDownload(file)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t.download}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
