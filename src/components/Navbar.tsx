import React from 'react';
import { AuthUser, UserStorageQuota, Language } from '../types/storage';
import { formatStorageSize } from '../services/storageQuotaService';
import { useTranslation } from '../utils/translations';
import {
  Cloud,
  Search,
  LogOut,
  Gift,
  Globe,
  X,
  HardDrive,
  HelpCircle
} from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface NavbarProps {
  user: AuthUser | null;
  quota: UserStorageQuota;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenInviteModal: () => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  lang: Language;
  onToggleLang: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  quota,
  searchQuery,
  onSearchChange,
  onOpenInviteModal,
  onLogin,
  onLogout,
  isLoggingIn,
  lang,
  onToggleLang,
}) => {
  const t = useTranslation(lang);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-gray-900 tracking-tight text-base sm:text-lg block leading-none">
              CloudVault
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              Google Drive Storage
            </span>
          </div>
        </div>

        {/* Search Bar (if logged in) */}
        {user && (
          <div className="flex-1 max-w-md mx-2 sm:mx-6 hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-100 hover:bg-gray-100/80 focus:bg-white border border-transparent focus:border-blue-400 rounded-xl transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            title={lang === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{lang === 'bn' ? 'বাংলা' : 'EN'}</span>
          </button>

          {user ? (
            <>
              {/* Storage Badge */}
              <button
                onClick={onOpenInviteModal}
                className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-800 text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>{formatStorageSize(quota.totalAllowedBytes)}</span>
                <span className="bg-blue-200/60 px-1.5 py-0.5 rounded text-[10px] text-blue-900 font-mono">
                  {formatStorageSize(quota.usedBytes)} {t.usedOf}
                </span>
              </button>

              {/* Invite Friends Button */}
              <button
                onClick={onOpenInviteModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Gift className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">+0.05 GB</span>
              </button>

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-gray-800 truncate max-w-[120px]">
                    {user.displayName || 'GamerGigaMC'}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title={t.signOut}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <GoogleSignInButton
              onClick={onLogin}
              isLoading={isLoggingIn}
              label={t.signInWithGoogle}
            />
          )}
        </div>
      </div>
    </header>
  );
};
