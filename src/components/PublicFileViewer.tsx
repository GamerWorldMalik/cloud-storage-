import React, { useState, useEffect } from 'react';
import { CloudFile, Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import { getPermanentFileBlob, openCloudDB } from '../services/persistentStorage';
import {
  Download,
  FileText,
  Cloud,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { getFileIcon, getExtensionBadge } from './FileList';

interface PublicFileViewerProps {
  fileId: string;
  onGoToApp: () => void;
  lang: Language;
}

export const PublicFileViewer: React.FC<PublicFileViewerProps> = ({
  fileId,
  onGoToApp,
  lang,
}) => {
  const [file, setFile] = useState<CloudFile | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadSharedFile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const db = await openCloudDB();
        const foundRecord: CloudFile | null = await new Promise((resolve) => {
          const tx = db.transaction(['files_metadata'], 'readonly');
          const store = tx.objectStore('files_metadata');
          const req = store.get(fileId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });

        if (!active) return;

        if (!foundRecord) {
          setError(
            lang === 'bn'
              ? 'শেয়ার করা ফাইলটি খুঁজে পাওয়া যায়নি অথবা মালিক এটি মুছে ফেলেছেন।'
              : 'The shared file could not be found or has been removed by the owner.'
          );
          setIsLoading(false);
          return;
        }

        setFile(foundRecord);

        // Fetch binary blob
        const blob = await getPermanentFileBlob(foundRecord);
        if (blob && active) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);

          const ext = (foundRecord.fileExtension || '').toLowerCase();
          if (foundRecord.mimeType.startsWith('text/') || ['txt', 'md', 'json', 'js', 'ts', 'html'].includes(ext)) {
            const txt = await blob.text();
            if (active) setTextContent(txt);
          }
        }
      } catch (err: any) {
        console.error('Error loading public file:', err);
        if (active) setError('Could not load shared file');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadSharedFile();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId, lang]);

  const handleDownload = () => {
    if (!file) return;
    const downloadSrc = blobUrl || file.cloudUrl;
    if (!downloadSrc) return;
    const a = document.createElement('a');
    a.href = downloadSrc;
    a.download = file.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-gray-500">
            {lang === 'bn' ? 'শেয়ার করা ফাইল লোড হচ্ছে...' : 'Loading shared file...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-1">
            {lang === 'bn' ? 'ফাইল পাওয়া যায়নি' : 'File Not Found'}
          </h2>
          <p className="text-xs text-gray-500 mb-6">{error}</p>
          <button
            onClick={onGoToApp}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {lang === 'bn' ? 'CloudVault হোমে যান' : 'Go to CloudVault Home'}
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Banner */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-base leading-none block">CloudVault</span>
              <span className="text-[10px] text-gray-400">Public Shared File</span>
            </div>
          </div>

          <button
            onClick={onGoToApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
          >
            <span>{lang === 'bn' ? 'ফ্রি ০.২৫ GB নিন' : 'Get Free 0.25 GB'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xl overflow-hidden p-6 sm:p-8">
          {/* File Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                {getFileIcon(file.mimeType, file.fileExtension)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-extrabold text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </h1>
                  {getExtensionBadge(file.name, file.fileExtension)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatStorageSize(file.size)} • {new Date(file.modifiedTime).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ডাউনলোড করুন' : 'Download File'}</span>
            </button>
          </div>

          {/* Visual Preview Box */}
          <div className="my-6 bg-gray-50 rounded-2xl border border-gray-200/80 p-4 flex items-center justify-center min-h-[260px] max-h-[460px] overflow-hidden relative">
            {isImage ? (
              <img
                src={blobUrl || file.cloudUrl || file.dataUrl || ''}
                alt={file.name}
                className="max-h-[420px] max-w-full object-contain rounded-xl shadow-xs"
              />
            ) : isVideo && (blobUrl || file.cloudUrl) ? (
              <video
                src={blobUrl || file.cloudUrl}
                controls
                className="max-h-[420px] max-w-full rounded-xl shadow-xs"
              />
            ) : isAudio && (blobUrl || file.cloudUrl) ? (
              <div className="w-full max-w-md p-6 bg-white rounded-2xl border border-gray-200 text-center shadow-xs">
                <p className="text-xs font-bold text-gray-900 mb-3">{file.name}</p>
                <audio src={blobUrl || file.cloudUrl} controls className="w-full" />
              </div>
            ) : isText ? (
              <div className="w-full h-full max-h-[420px] bg-white rounded-xl border border-gray-200 p-4 font-mono text-xs text-gray-800 overflow-y-auto text-left">
                <div className="sticky top-0 bg-white/95 pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    {file.name}
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
                  {textContent || file.textContent || 'Loading content...'}
                </pre>
              </div>
            ) : (
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-white shadow-xs border border-gray-200 flex items-center justify-center mb-3">
                  {getFileIcon(file.mimeType, file.fileExtension)}
                </div>
                <p className="text-xs font-bold text-gray-900">{file.name}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {formatStorageSize(file.size)}
                </p>
              </div>
            )}
          </div>

          {/* Guest Sign-up CTA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700">
                {lang === 'bn'
                  ? 'আপনিও বিনামূল্যে ০.২৫ জিবি (২৫৬ MB) ক্লাউড স্টোরেজ ব্যবহার করতে চান?'
                  : 'Want your own 0.25 GB free cloud space to store and share files?'}
              </span>
            </div>
            <button
              onClick={onGoToApp}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 transition-colors cursor-pointer shadow-xs"
            >
              {lang === 'bn' ? 'ফ্রি একাউন্ট খুলুন' : 'Sign Up Free'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
