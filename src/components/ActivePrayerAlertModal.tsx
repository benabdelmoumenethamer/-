import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  X,
  BellRing,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { ActiveAlertData, notificationService } from '../services/notificationService';
import { Language, PrayerSettings } from '../types/prayer';

interface Props {
  alertData: ActiveAlertData | null;
  onClose: () => void;
  language: Language;
  settings: PrayerSettings;
}

export const ActivePrayerAlertModal: React.FC<Props> = ({
  alertData,
  onClose,
  language,
  settings,
}) => {
  const [showDuaa, setShowDuaa] = useState(true);
  const [isPlaying, setIsPlaying] = useState(() => notificationService.getIsPlaying());
  const isArabic = language === 'ar';

  useEffect(() => {
    setIsPlaying(notificationService.getIsPlaying());
    const unsubscribe = notificationService.subscribe(() => {
      setIsPlaying(notificationService.getIsPlaying());
    });
    return unsubscribe;
  }, [alertData]);

  if (!alertData) return null;

  const prayerName = isArabic ? alertData.titleAr : alertData.titleFr;

  const handleStopAudio = () => {
    notificationService.stopAudio();
  };

  const handleToggleAudio = () => {
    if (isPlaying) {
      notificationService.stopAudio();
    } else {
      notificationService.unlockAudio();
      notificationService.playMuezzin(settings.selectedMuezzinId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 border-2 border-amber-400/60 shadow-2xl shadow-amber-500/10 text-slate-100 flex flex-col overflow-hidden">
        {/* Glowing top badge */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center animate-bounce flex-shrink-0">
              <BellRing className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">
                {alertData.isTest
                  ? isArabic ? 'اختبار تجريبي' : 'Test d\'Alerte'
                  : isArabic ? 'حان الآن وقت الصلاة' : 'C\'est l\'heure de la prière'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {prayerName}
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              handleStopAudio();
              onClose();
            }}
            className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-5 flex flex-col items-center text-center space-y-4">
          {/* Mosque sound animation */}
          <div className="relative flex items-center justify-center my-1">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-800/60 border border-amber-400/30 flex items-center justify-center shadow-inner">
              <span className="text-3xl sm:text-4xl">🕌</span>
            </div>
            {isPlaying && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping" />
                <div className="absolute -inset-2 rounded-full border border-emerald-400/30 animate-pulse" />
              </>
            )}
          </div>

          <div>
            <p className="text-sm sm:text-base text-emerald-200 font-medium">
              {isArabic
                ? 'حي على الصلاة • حي على الفلاح • الصلاة خير من النوم'
                : 'Accourez à la prière • Accourez au succès'}
            </p>
            <p className="text-xs text-amber-300/90 mt-1 font-semibold">
              {isPlaying
                ? isArabic ? '🔊 صوت الأذان يرتفع الآن...' : '🔊 Récitation de l\'Adhan en cours...'
                : isArabic ? '⚠️ اضغط على زر تشغيل الصوت بالأسفل لسماع الأذان' : '⚠️ Appuyez sur le bouton ci-dessous pour démarrer le son'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleToggleAudio}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-sm transition cursor-pointer ${
                isPlaying
                  ? 'bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700 text-amber-300'
                  : 'bg-amber-500 hover:bg-amber-400 text-emerald-950 shadow-lg shadow-amber-500/30 animate-pulse ring-2 ring-amber-300'
              }`}
            >
              {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>
                {isPlaying
                  ? isArabic ? 'إيقاف الصوت' : 'Couper le son'
                  : isArabic ? '▶️ تشغيل الأذان' : '▶️ Jouer l\'Adhan'}
              </span>
            </button>

            <button
              onClick={() => {
                handleStopAudio();
                onClose();
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-sm bg-emerald-800 hover:bg-emerald-700 text-white transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isArabic ? 'إغلاق التنبيه' : 'Compris / Fermer'}</span>
            </button>
          </div>

          {/* Duaa after Adhan Accordion */}
          <div className="w-full bg-emerald-900/50 rounded-2xl border border-emerald-800 p-3.5 text-start">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800/80 text-xs text-amber-400 font-bold">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {isArabic ? 'دعاء ما بعد الأذان' : 'Invocation après l\'Adhan'}
              </span>
              <button
                onClick={() => setShowDuaa(!showDuaa)}
                className="text-[11px] text-emerald-300 underline cursor-pointer hover:text-white"
              >
                {showDuaa ? (isArabic ? 'إخفاء' : 'Masquer') : (isArabic ? 'عرض' : 'Afficher')}
              </button>
            </div>

            {showDuaa && (
              <div className="space-y-2 text-xs leading-relaxed">
                <p className="font-serif text-sm text-amber-100/90 text-right font-medium">
                  « اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ »
                </p>
                <p className="text-emerald-300/80 text-[11px] italic">
                  "Ô Allah, Seigneur de ce parfait appel et de la prière qui va être accomplie, accorde à Mohammed la place éminente et la supériorité, et élève-le au rang louable que Tu lui as promis."
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
