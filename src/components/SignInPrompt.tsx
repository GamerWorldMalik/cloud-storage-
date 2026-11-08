import React, { useState } from 'react';
import { Language } from '../types/storage';
import { useTranslation } from '../utils/translations';
import {
  HardDrive,
  Mail,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SignInPromptProps {
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, pass: string) => Promise<void>;
  onEmailSignUp: (name: string, email: string, pass: string) => Promise<void>;
  onOpenGuideModal?: () => void;
  isLoading: boolean;
  lang: Language;
}

export const SignInPrompt: React.FC<SignInPromptProps> = ({
  onGoogleLogin,
  onEmailLogin,
  onEmailSignUp,
  isLoading,
  lang,
}) => {
  const t = useTranslation(lang);
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError(lang === 'bn' ? 'ইমেইল ও পাসওয়ার্ড প্রদান করুন।' : 'Please enter email and password.');
      return;
    }

    if (password.length < 6) {
      setFormError(
        lang === 'bn'
          ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await onEmailSignUp(name, email, password);
      } else {
        await onEmailLogin(email, password);
      }
    } catch (err: any) {
      setFormError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-blue-50/50 via-white to-gray-50">
      <div className="max-w-2xl w-full text-center py-10 px-6 sm:px-10 bg-white/90 backdrop-blur-md rounded-3xl border border-gray-200/80 shadow-xl">
        {/* Floating icon badge */}
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 mb-4">
          <HardDrive className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          {t.signInPromptTitle}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
          {t.signInPromptDesc}
        </p>

        {/* Highlight Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-6 text-left">
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 flex flex-col justify-between">
            <div className="text-xs font-bold text-blue-900">0.25 GB Free Space</div>
            <div className="text-[11px] text-gray-500 mt-1">
              {lang === 'bn' ? 'সাইন ইন করলেই পেয়ে যান ০.২৫ জিবি' : 'Instant 0.25 GB starter storage'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex flex-col justify-between">
            <div className="text-xs font-bold text-emerald-900">+0.05 GB per Friend</div>
            <div className="text-[11px] text-gray-500 mt-1">
              {lang === 'bn' ? '১ জন বন্ধু জয়েন করলে +০.০৫ জিবি' : 'Earn 0.05 GB for each friend invite'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-100 flex flex-col justify-between">
            <div className="text-xs font-bold text-purple-900">100% Private Cloud</div>
            <div className="text-[11px] text-gray-500 mt-1">
              {lang === 'bn' ? 'নিরাপদ ক্লাউড ড্রাইভ ও ব্যাকআপ' : 'Protected private cloud storage'}
            </div>
          </div>
        </div>

        {/* Method Toggle Tabs */}
        <div className="inline-flex p-1 bg-gray-100 rounded-xl mb-6">
          <button
            onClick={() => setAuthMethod('google')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              authMethod === 'google'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {lang === 'bn' ? 'গুগল সাইন ইন (সবার জন্য উন্মুক্ত)' : 'Google Sign-In (Unrestricted)'}
          </button>
          <button
            onClick={() => setAuthMethod('email')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              authMethod === 'email'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {lang === 'bn' ? 'ইমেইল ও পাসওয়ার্ড' : 'Email & Password'}
          </button>
        </div>

        {/* Form Containers */}
        {authMethod === 'google' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-2">
            <GoogleSignInButton
              onClick={onGoogleLogin}
              isLoading={isLoading}
              label={t.signInWithGoogle}
            />

            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {lang === 'bn'
                  ? 'আপনি ও আপনার বন্ধুরা সরাসরি যে কোনো গুগল একাউন্ট দিয়ে সাইন ইন করতে পারবেন!'
                  : 'Open for all: You and your friends can sign in with any Google account!'}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitEmail} className="max-w-sm mx-auto text-left space-y-3">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {lang === 'bn' ? 'আপনার নাম' : 'Your Name'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Hasan"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {lang === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <span>
                {isSubmitting
                  ? 'Processing...'
                  : isRegisterMode
                  ? lang === 'bn'
                    ? 'একাউন্ট খুলুন (০.২৫ GB ফ্রি)'
                    : 'Create Account (0.25 GB Free)'
                  : lang === 'bn'
                  ? 'লগইন করুন'
                  : 'Sign In'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setIsRegisterMode(!isRegisterMode);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold underline cursor-pointer"
              >
                {isRegisterMode
                  ? lang === 'bn'
                    ? 'আগে থেকেই একাউন্ট আছে? লগইন করুন'
                    : 'Already have an account? Sign In'
                  : lang === 'bn'
                  ? 'নতুন ব্যবহারকারী? ফ্রি একাউন্ট খুলুন'
                  : 'New user? Create a free account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
