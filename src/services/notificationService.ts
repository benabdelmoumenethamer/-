import { MUEZZIN_OPTIONS } from '../data/muezzins';
import { MuezzinOption, PrayerKey, PrayerSettings } from '../types/prayer';

const FALLBACK_CDN_URLS: Record<string, string> = {
  makkah: 'https://cdn.aladhan.com/audio/adhans/a2.mp3',
  madinah: 'https://cdn.aladhan.com/audio/adhans/a3.mp3',
  algeria: 'https://cdn.aladhan.com/audio/adhans/a1.mp3',
  alaqsa: 'https://cdn.aladhan.com/audio/adhans/a4.mp3',
};

class AudioAndNotificationManager {
  private audioElement: HTMLAudioElement | null = null;
  private currentMuezzin: MuezzinOption | null = null;
  private isPlaying = false;
  private volume = 0.9;
  private listeners: Set<() => void> = new Set();
  private notificationHistory: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    if (this.audioElement) return;
    this.audioElement = new Audio();
    this.audioElement.volume = this.volume;
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.notifyListeners();
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyListeners();
    });

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.notifyListeners();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Primary audio source failed, attempting CDN fallback:', e);
      // Try online CDN fallback with authentic vocal recitation (NO synth, NO music)
      if (this.currentMuezzin && this.audioElement) {
        const fallbackUrl = FALLBACK_CDN_URLS[this.currentMuezzin.id];
        if (fallbackUrl && this.audioElement.src !== fallbackUrl) {
          this.audioElement.src = fallbackUrl;
          this.audioElement.play().catch((err) => {
            console.error('Fallback Adhan playback error:', err);
            this.isPlaying = false;
            this.notifyListeners();
          });
          return;
        }
      }
      this.isPlaying = false;
      this.notifyListeners();
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentMuezzin(): MuezzinOption | null {
    return this.currentMuezzin;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    this.notifyListeners();
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  public hasNotificationPermission(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  public sendNotification(title: string, options: NotificationOptions = {}): void {
    if (!this.hasNotificationPermission()) return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          (reg as unknown as { showNotification: (t: string, o?: Record<string, unknown>) => Promise<void> }).showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
            ...options,
          });
        });
      } else {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          ...options,
        });
      }
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }

  /**
   * Plays the authentic, human vocal Adhan recitation.
   * Completely devoid of musical instruments or synthesizers.
   */
  public async playMuezzin(muezzinId: string): Promise<void> {
    const muezzin = MUEZZIN_OPTIONS.find((m) => m.id === muezzinId) || MUEZZIN_OPTIONS[0];
    this.currentMuezzin = muezzin;

    this.stopAudio();
    this.initAudioElement();

    if (this.audioElement) {
      try {
        this.audioElement.src = muezzin.audioUrl;
        this.audioElement.currentTime = 0;
        await this.audioElement.play();
        this.isPlaying = true;
        this.notifyListeners();
      } catch (err) {
        console.warn('Local audio error, trying backup CDN:', err);
        const fallbackUrl = FALLBACK_CDN_URLS[muezzin.id];
        if (fallbackUrl && this.audioElement) {
          try {
            this.audioElement.src = fallbackUrl;
            this.audioElement.currentTime = 0;
            await this.audioElement.play();
            this.isPlaying = true;
            this.notifyListeners();
          } catch (e2) {
            console.error('All audio sources blocked by browser policy:', e2);
            this.isPlaying = false;
            this.notifyListeners();
          }
        }
      }
    }
  }

  public stopAudio(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.isPlaying = false;
    this.notifyListeners();
  }

  /**
   * Checks if an adhan or pre-prayer notification should be sent right now
   */
  public checkAndTriggerPrayerAlert(
    prayerKey: PrayerKey,
    prayerNameAr: string,
    prayerNameFr: string,
    prayerTime: Date,
    settings: PrayerSettings
  ) {
    if (settings.silentMode) return;

    const now = new Date();
    const diffMs = prayerTime.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    const prayerConfig = settings.prayerSoundConfig[prayerKey];
    if (!prayerConfig?.enabled) return;

    const isArabic = settings.language === 'ar';
    const prayerTitle = isArabic ? prayerNameAr : prayerNameFr;

    // 1. Exact prayer time trigger (window between 0 and 1 min)
    const exactKey = `exact_${prayerKey}_${prayerTime.toISOString().slice(0, 10)}`;
    if (diffMs <= 5000 && diffMs >= -59000 && !this.notificationHistory.has(exactKey)) {
      this.notificationHistory.add(exactKey);

      const notifTitle = isArabic
        ? `حان الآن موعد صلاة ${prayerTitle}`
        : `C'est l'heure de la prière de ${prayerTitle}`;
      const notifBody = isArabic
        ? `حي على الصلاة، حي على الفلاح (الله أكبر)`
        : `Accourez à la prière, accourez au succès`;

      this.sendNotification(notifTitle, { body: notifBody, tag: exactKey });

      if (prayerConfig.playAdhan && settings.fullAdhanEnabled) {
        this.playMuezzin(settings.selectedMuezzinId);
      }
    }

    // 2. Pre-prayer alert (configured e.g. 5, 10, or 15 minutes before)
    if (settings.preNotificationMinutes > 0) {
      const preKey = `pre_${prayerKey}_${prayerTime.toISOString().slice(0, 10)}_${settings.preNotificationMinutes}`;
      if (
        diffMinutes === settings.preNotificationMinutes &&
        !this.notificationHistory.has(preKey)
      ) {
        this.notificationHistory.add(preKey);

        const notifTitle = isArabic
          ? `اقتراب صلاة ${prayerTitle}`
          : `Rappel : Prière de ${prayerTitle} imminente`;
        const notifBody = isArabic
          ? `بقي ${settings.preNotificationMinutes} دقيقة على موعد الأذان`
          : `Plus que ${settings.preNotificationMinutes} minutes avant l'Adhan`;

        this.sendNotification(notifTitle, { body: notifBody, tag: preKey });
      }
    }
  }
}

export const notificationService = new AudioAndNotificationManager();
