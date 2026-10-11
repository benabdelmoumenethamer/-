import React from 'react';
import {
  Bell,
  BellOff,
  Compass,
  CalendarDays,
  Settings,
  Sparkles,
  Volume2,
  Code2,
  VolumeX,
} from 'lucide-react';
import { HijriDateInfo, Language } from '../types/prayer';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  hijriDate: HijriDateInfo;
  currentTime: Date;
  silentMode: boolean;
  onToggleSilentMode: () => void;
  onOpenSettings: () => void;
  onOpenCalendar: () => void;
  onOpenQibla: () => void;
  onOpenTasbih: () => void;
  onOpenFlutterGuide: () => void;
  isPlayingAdhan: boolean;
  onStopAdhan: () => void;
}

export const Header: React.FC<Props> = ({
  language,
  onLanguageChange,
  hijriDate,
  currentTime,
  silentMode,
  onToggleSilentMode,
  onOpenSettings,
  onOpenCalendar,
  onOpenQibla,
  onOpenTasbih,
  onOpenFlutterGuide,
  isPlayingAdhan,
  onStopAdhan,
}) => {
  const isArabic = language === 'ar';

  const timeString = currentTime.toLocaleTimeString(isArabic ? 'ar-DZ' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const gregorianDateString = currentTime.toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-40 w-full bg-emerald-950/90 backdrop-blur-md border-b border-emerald-800/50 transition-all">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-300/40 flex-shrink-0">
            <span className="text-emerald-950 font-black text-xl font-quran select-none">
              أذان
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{isArabic ? 'آذان – أوقات الصلاة' : 'Adhan – Prières'}</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {isArabic ? 'الجزائر والعالم' : 'Algérie & Monde'}
              </span>
            </div>
            {/* Hijri & Gregorian Dates */}
            <div className="flex items-center gap-2 text-xs text-emerald-200/80">
              <span className="font-semibold text-amber-300/90 font-quran text-sm">
                {isArabic ? hijriDate.formattedAr : hijriDate.formattedFr}
              </span>
              <span className="text-emerald-500">·</span>
              <span className="hidden md:inline">{gregorianDateString}</span>
              <span className="hidden md:inline text-emerald-500">·</span>
              <span className="font-mono font-medium text-emerald-100">{timeString}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Adhan active indicator / stop button */}
          {isPlayingAdhan && (
            <button
              onClick={onStopAdhan}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs animate-pulse cursor-pointer shadow-md shadow-amber-500/30"
              title={isArabic ? 'إيقاف الأذان' : 'Arrêter l\'Adhan'}
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{isArabic ? 'إيقاف' : 'Stop'}</span>
            </button>
          )}

          {/* Qibla button */}
          <button
            onClick={onOpenQibla}
            className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 transition cursor-pointer"
            title={isArabic ? 'بوصلة القبلة' : 'Boussole Qibla'}
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Tasbih button */}
          <button
            onClick={onOpenTasbih}
            className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 transition cursor-pointer"
            title={isArabic ? 'المسبحة الإلكترونية والأذكار' : 'Tasbih & Évocations'}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Calendar button */}
          <button
            onClick={onOpenCalendar}
            className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 transition cursor-pointer"
            title={isArabic ? 'جدول مواقيت الصلاة الشهري' : 'Calendrier mensuel'}
          >
            <CalendarDays className="w-4 h-4" />
          </button>

          {/* Silent mode toggle */}
          <button
            onClick={onToggleSilentMode}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              silentMode
                ? 'bg-rose-950/70 border-rose-600/60 text-rose-300 hover:bg-rose-900/80'
                : 'bg-emerald-900/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-800'
            }`}
            title={
              silentMode
                ? isArabic
                  ? 'الوضع الصامت مفعل'
                  : 'Mode silencieux activé'
                : isArabic
                  ? 'التنبيهات مفعلة'
                  : 'Sonneries activées'
            }
          >
            {silentMode ? <BellOff className="w-4 h-4 text-rose-400" /> : <Bell className="w-4 h-4" />}
          </button>

          {/* Flutter APK code guide */}
          <button
            onClick={onOpenFlutterGuide}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-200 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
            title={isArabic ? 'كود تطبيق Flutter وملف APK' : 'Code Flutter & APK Android'}
          >
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isArabic ? 'ملف APK' : 'APK'}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => onLanguageChange(isArabic ? 'fr' : 'ar')}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 text-xs font-bold transition cursor-pointer"
            title={isArabic ? 'Changer en Français' : 'التحويل إلى العربية'}
          >
            {isArabic ? 'FR' : 'عربي'}
          </button>

          {/* PWA Install */}
          <PWAInstallButton language={language} />

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 border border-emerald-700/60 transition cursor-pointer"
            title={isArabic ? 'الإعدادات' : 'Paramètres'}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
