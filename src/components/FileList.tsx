import React from 'react';
import { CloudFile, ViewMode, Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import { useTranslation } from '../utils/translations';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Star,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Share2,
  Edit3
} from 'lucide-react';

interface FileListProps {
  files: CloudFile[];
  viewMode: ViewMode;
  onPreview: (file: CloudFile) => void;
  onDownload: (file: CloudFile) => void;
  onDeleteRequest: (file: CloudFile) => void;
  onToggleStar: (file: CloudFile) => void;
  onShare: (file: CloudFile) => void;
  onRename: (file: CloudFile) => void;
  lang: Language;
}

export const getFileIcon = (mimeType: string, extension?: string) => {
  const ext = (extension || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-5 h-5 text-emerald-500" />;
  }
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return <Film className="w-5 h-5 text-purple-500" />;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
    return <Music className="w-5 h-5 text-amber-500" />;
  }
  if (mime.includes('pdf') || ext === 'pdf') {
    return <FileText className="w-5 h-5 text-rose-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('compressed') || mime.includes('zip')) {
    return <Archive className="w-5 h-5 text-orange-500" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('sheet') || mime.includes('excel')) {
    return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-cyan-600" />;
  }
  return <FileText className="w-5 h-5 text-blue-500" />;
};

export const getExtensionBadge = (name: string, ext?: string) => {
  const extension = ext || name.split('.').pop()?.toUpperCase() || 'FILE';
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">
      {extension.slice(0, 4)}
    </span>
  );
};

export const FileList: React.FC<FileListProps> = ({
  files,
  viewMode,
  onPreview,
  onDownload,
  onDeleteRequest,
  onToggleStar,
  onShare,
  onRename,
  lang,
}) => {
  const t = useTranslation(lang);

  if (files.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-3xl border border-gray-200/80 mt-4 shadow-2xs">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <HardDrive className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-gray-800">{t.noFilesFound}</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
          {t.noFilesDesc}
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">{lang === 'bn' ? 'ফাইলের নাম' : 'File Name'}</th>
                <th className="py-3.5 px-4">{t.fileSize}</th>
                <th className="py-3.5 px-4 hidden md:table-cell">{t.lastModified}</th>
                <th className="py-3.5 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((file) => (
                <tr
                  key={file.id}
                  className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  onClick={() => onPreview(file)}
                >
                  <td className="py-3 px-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(file);
                      }}
                      className="text-gray-300 hover:text-amber-400 cursor-pointer transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          file.isStarred ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                      {getFileIcon(file.mimeType, file.fileExtension)}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-gray-900 group-hover:text-blue-600 truncate max-w-xs md:max-w-md">
                        {file.name}
                      </span>
                      {getExtensionBadge(file.name, file.fileExtension)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                    {formatStorageSize(file.size)}
                  </td>
                  <td className="py-3 px-4 text-gray-400 hidden md:table-cell whitespace-nowrap">
                    {new Date(file.modifiedTime).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button
                        title={lang === 'bn' ? 'শেয়ার' : 'Share'}
                        onClick={() => onShare(file)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        title={lang === 'bn' ? 'রিনেম' : 'Rename'}
                        onClick={() => onRename(file)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        title={t.download}
                        onClick={() => onDownload(file)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        title={t.delete}
                        onClick={() => onDeleteRequest(file)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Grid View with Visual Thumbnails and Preview Snippets
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 mt-4">
      {files.map((file) => {
        const isImage =
          file.mimeType.startsWith('image/') ||
          ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes((file.fileExtension || '').toLowerCase());
        const isVideo =
          file.mimeType.startsWith('video/') ||
          ['mp4', 'webm', 'mov'].includes((file.fileExtension || '').toLowerCase());
        const isText =
          file.mimeType.startsWith('text/') ||
          ['txt', 'md', 'json', 'js', 'ts'].includes((file.fileExtension || '').toLowerCase());

        return (
          <div
            key={file.id}
            onClick={() => onPreview(file)}
            className="group relative bg-white rounded-2xl border border-gray-200/90 p-3 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            {/* Top row: Star and Actions */}
            <div className="flex items-center justify-between mb-2 z-10" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onToggleStar(file)}
                className="text-gray-300 hover:text-amber-400 cursor-pointer transition-colors p-1 -m-1"
              >
                <Star
                  className={`w-4 h-4 ${
                    file.isStarred ? 'fill-amber-400 text-amber-400' : ''
                  }`}
                />
              </button>
              <div className="flex items-center gap-1">
                <button
                  title={lang === 'bn' ? 'শেয়ার' : 'Share'}
                  onClick={() => onShare(file)}
                  className="p-1 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  title={t.download}
                  onClick={() => onDownload(file)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  title={t.delete}
                  onClick={() => onDeleteRequest(file)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Thumbnail / Picture / Preview Zone */}
            <div className="h-32 w-full rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden mb-2.5 relative group-hover:bg-blue-50/40 transition-colors border border-gray-100">
              {isImage && (file.dataUrl || file.blobUrl) ? (
                <img
                  src={file.dataUrl || file.blobUrl}
                  alt={file.name}
                  className="w-full h-full object-cover rounded-xl"
                  loading="lazy"
                />
              ) : isVideo ? (
                <div className="flex flex-col items-center justify-center gap-1.5 p-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                    <Film className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded">
                    Video Clip
                  </span>
                </div>
              ) : isText && file.textContent ? (
                <div className="p-3 w-full h-full text-left font-mono text-[9px] text-gray-600 bg-amber-50/40 overflow-hidden leading-tight border border-amber-100 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>{file.fileExtension?.toUpperCase() || 'TXT'}</span>
                  </div>
                  <div className="line-clamp-4 text-gray-600 select-none">
                    {file.textContent}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-3">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-gray-100 flex items-center justify-center mb-1">
                    {getFileIcon(file.mimeType, file.fileExtension)}
                  </div>
                  {getExtensionBadge(file.name, file.fileExtension)}
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="p-2 rounded-full bg-white/95 text-gray-800 shadow-md">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Details: EXACT File Name as uploaded */}
            <div>
              <div className="flex items-center justify-between gap-1">
                <p
                  className="text-xs font-bold text-gray-900 group-hover:text-blue-600 truncate flex-1"
                  title={file.name}
                >
                  {file.name}
                </p>
                {getExtensionBadge(file.name, file.fileExtension)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                <span className="font-semibold text-gray-700">{formatStorageSize(file.size)}</span>
                <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
