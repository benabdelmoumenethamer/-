import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { MUEZZIN_OPTIONS } from '../data/muezzins';
import { Language, MuezzinOption, PrayerKey, PrayerSettings, PrayerTimeInfo } from '../types/prayer';

const FALLBACK_CDN_URLS: Record<string, string> = {
  makkah: 'https://cdn.aladhan.com/audio/adhans/a2.mp3',
  madinah: 'https://cdn.aladhan.com/audio/adhans/a3.mp3',
  algeria: 'https://cdn.aladhan.com/audio/adhans/a1.mp3',
  alaqsa: 'https://cdn.aladhan.com/audio/adhans/a4.mp3',
};

export interface ActiveAlertData {
  key: PrayerKey;
  titleAr: string;
  titleFr: string;
  time: Date;
  isTest?: boolean;
}

type AlertCallback = (data: ActiveAlertData) => void;

class AudioAndNotificationManager {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private currentMuezzin: MuezzinOption | null = null;
  private isPlaying = false;
  private isAudioBlocked = false;
  private volume = 1.0;
  private listeners: Set<() => void> = new Set();
  private alertListeners: Set<AlertCallback> = new Set();
  private audioUnlocked = false;
  private channelCreated = false;
  private nativeListenersAttached = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
      this.attachAudioUnlockListeners();
      this.initNativeChannel();
      this.initNativeListeners();
    }
  }

  private initAudioElement() {
    if (this.audioElement) return;
    this.audioElement = new Audio();
    this.audioElement.volume = this.volume;
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.isAudioBlocked = false;
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
      if (this.currentMuezzin && this.audioElement) {
        const fallbackUrl = FALLBACK_CDN_URLS[this.currentMuezzin.id];
        if (fallbackUrl && this.audioElement.src !== fallbackUrl) {
          this.audioElement.src = fallbackUrl;
          this.audioElement.play().catch((err) => {
            console.error('Fallback Adhan playback error:', err);
            this.isPlaying = false;
            this.isAudioBlocked = true;
            this.notifyListeners();
          });
          return;
        }
      }
      this.isPlaying = false;
      this.notifyListeners();
    });
  }

  /**
   * Unlock Audio Autoplay policy on first user interaction (touch, click, pointer)
   */
  public attachAudioUnlockListeners() {
    if (typeof window === 'undefined') return;
    const unlockHandler = () => {
      this.unlockAudio();
    };
    window.addEventListener('click', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
    window.addEventListener('pointerdown', unlockHandler, { passive: true });
  }

  public unlockAudio(): void {
    if (this.audioUnlocked) return;
    try {
      this.initAudioElement();

      // 1. Resume Web Audio API context if suspended
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx && !this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      // 2. Play silent micro-buffer on HTMLAudioElement
      if (this.audioElement) {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        silentAudio.volume = 0.01;
        silentAudio.play().then(() => {
          this.audioUnlocked = true;
          this.isAudioBlocked = false;
          this.notifyListeners();
        }).catch(() => {
          // Will retry on next interaction
        });
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Setup Android Notification Channel with High Importance & Sound in res/raw/
   */
  private async initNativeChannel() {
    if (!Capacitor.isNativePlatform() || this.channelCreated) return;
    try {
      // Clean up previous channel to ensure sound settings are updated on device
      try {
        await LocalNotifications.deleteChannel({ id: 'adhan_prayers_channel' });
      } catch {
        // Ignored if didn't exist
      }

      await LocalNotifications.createChannel({
        id: 'adhan_prayers_channel_v3',
        name: 'آذان – أوقات الصلاة (Adhan)',
        description: 'تنبيهات وأصوات الأذان للصلوات الخمس المفروضة',
        importance: 5, // MAX importance (heads-up notification)
        visibility: 1, // Public
        sound: 'adhan_algeria.mp3', // Located in android/app/src/main/res/raw/adhan_algeria.mp3
        vibration: true,
        lights: true,
        lightColor: '#064E3B',
      });
      this.channelCreated = true;
    } catch (e) {
      console.warn('Could not create Android notification channel:', e);
    }
  }

  /**
   * Listen to native notification taps to start Adhan audio when user opens the app via notification
   */
  private initNativeListeners() {
    if (!Capacitor.isNativePlatform() || this.nativeListenersAttached) return;

    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const extra = notificationAction.notification.extra;
        const muezzinId = extra?.muezzinId || 'algeria';
        const prayerKey = (extra?.prayerKey as PrayerKey) || 'fajr';
        const titleAr = extra?.prayerTitleAr || 'الصلاة';
        const titleFr = extra?.prayerTitleFr || 'Prière';

        // Play the Adhan audio immediately upon opening notification!
        this.playMuezzin(muezzinId);

        // Show active visual prayer alert
        this.notifyAlertListeners({
          key: prayerKey,
          titleAr,
          titleFr,
          time: new Date(),
        });
      });

      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        // Notification received while app is active in foreground
        const extra = notification.extra;
        const muezzinId = extra?.muezzinId || 'algeria';
        this.playMuezzin(muezzinId);
      });

      this.nativeListenersAttached = true;
    } catch (e) {
      console.warn('Could not attach native notification listeners:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onAlertTrigger(callback: AlertCallback): () => void {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  public notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  public notifyAlertListeners(data: ActiveAlertData) {
    this.alertListeners.forEach((l) => l(data));
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsAudioBlocked(): boolean {
    return this.isAudioBlocked;
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

  /**
   * Check current permission status
   */
  public async getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
    if (typeof window === 'undefined') return 'denied';

    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'granted') return 'granted';
        if (perm.display === 'denied') return 'denied';
        return 'prompt';
      } catch {
        return 'prompt';
      }
    }

    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'prompt';
  }

  /**
   * Request system notification permission (Native Android or Web)
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.unlockAudio();

    if (Capacitor.isNativePlatform()) {
      try {
        await this.initNativeChannel();
        const perm = await LocalNotifications.requestPermissions();
        return perm.display === 'granted';
      } catch (err) {
        console.warn('Native permission request error:', err);
        return false;
      }
    }

    if (!('Notification' in window)) {
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
    if (typeof window === 'undefined') return false;
    if (Capacitor.isNativePlatform()) return true; // Handled by plugin
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  /**
   * Schedule Native Android background alarms with exact wake-up in Doze mode
   */
  public async scheduleNativePrayerAlarms(
    prayers: PrayerTimeInfo[],
    settings: PrayerSettings
  ): Promise<void> {
    if (!Capacitor.isNativePlatform() || settings.silentMode) return;

    try {
      await this.initNativeChannel();

      // Clear existing scheduled adhan notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const isArabic = settings.language === 'ar';
      const toSchedule: {
        id: number;
        title: string;
        body: string;
        schedule: { at: Date; allowWhileIdle: boolean };
        channelId: string;
        sound: string;
        extra?: Record<string, unknown>;
      }[] = [];

      const now = new Date();
      const soundFile = `adhan_${settings.selectedMuezzinId || 'algeria'}.mp3`;

      prayers.forEach((prayer, index) => {
        if (prayer.key === 'sunrise') return;
        const config = settings.prayerSoundConfig[prayer.key];
        if (!config?.enabled) return;

        const prayerTitle = isArabic ? prayer.titleAr : prayer.titleFr;
        const prayerDate = new Date(prayer.time);

        // Schedule exact prayer alarm if in the future
        if (prayerDate.getTime() > now.getTime()) {
          toSchedule.push({
            id: index * 10 + 1,
            title: isArabic
              ? `حان الآن موعد صلاة ${prayerTitle}`
              : `C'est l'heure de la prière de ${prayerTitle}`,
            body: isArabic
              ? `حي على الصلاة، حي على الفلاح (الله أكبر)`
              : `Accourez à la prière, accourez au succès`,
            schedule: {
              at: prayerDate,
              allowWhileIdle: true, // Wakes Android phone from deep sleep
            },
            channelId: 'adhan_prayers_channel_v3',
            sound: soundFile,
            extra: {
              prayerKey: prayer.key,
              prayerTitleAr: prayer.titleAr,
              prayerTitleFr: prayer.titleFr,
              muezzinId: settings.selectedMuezzinId,
            },
          });
        }

        // Schedule pre-notification if configured
        if (settings.preNotificationMinutes > 0) {
          const preDate = new Date(prayerDate.getTime() - settings.preNotificationMinutes * 60000);
          if (preDate.getTime() > now.getTime()) {
            toSchedule.push({
              id: index * 10 + 2,
              title: isArabic
                ? `اقتراب صلاة ${prayerTitle}`
                : `Rappel : Prière de ${prayerTitle} imminente`,
              body: isArabic
                ? `بقي ${settings.preNotificationMinutes} دقيقة على موعد الأذان`
                : `Plus que ${settings.preNotificationMinutes} minutes avant l'Adhan`,
              schedule: {
                at: preDate,
                allowWhileIdle: true,
              },
              channelId: 'adhan_prayers_channel_v3',
              sound: soundFile,
            });
          }
        }
      });

      if (toSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: toSchedule });
        console.log(`Scheduled ${toSchedule.length} native Android prayer alarms successfully with sound ${soundFile}.`);
      }
    } catch (err) {
      console.warn('Native prayer scheduling error:', err);
    }
  }

  /**
   * Send a system notification (Web / Service Worker / Native)
   */
  public async sendNotification(
    title: string,
    options: NotificationOptions & { soundFile?: string } = {}
  ): Promise<void> {
    // Vibrate device if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 1000]);
      } catch {
        // Ignored
      }
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await this.initNativeChannel();
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 100000,
              title,
              body: (options.body as string) || '',
              schedule: { at: new Date(Date.now() + 100) },
              channelId: 'adhan_prayers_channel_v3',
              sound: options.soundFile || 'adhan_algeria.mp3',
            },
          ],
        });
        return;
      } catch (e) {
        console.warn('Native immediate notification error:', e);
      }
    }

    if (!this.hasNotificationPermission()) return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          ...options,
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
   * Plays authentic Muezzin recitation with multiple fallbacks
   */
  public async playMuezzin(muezzinId: string): Promise<void> {
    const muezzin = MUEZZIN_OPTIONS.find((m) => m.id === muezzinId) || MUEZZIN_OPTIONS[0];
    this.currentMuezzin = muezzin;

    this.stopAudio();
    this.initAudioElement();

    if (!this.audioElement) return;

    // Resolve URL safely (works across Web, PWA, and Capacitor WebView)
    const targetUrl = typeof window !== 'undefined'
      ? new URL(muezzin.audioUrl, window.location.href).href
      : muezzin.audioUrl;

    try {
      this.audioElement.src = targetUrl;
      this.audioElement.currentTime = 0;
      await this.audioElement.play();
      this.isPlaying = true;
      this.isAudioBlocked = false;
      this.notifyListeners();
    } catch (err: unknown) {
      console.warn('Primary audio playback error:', err);

      // Check if blocked by browser autoplay policy
      const errorMsg = String(err);
      if (errorMsg.includes('NotAllowedError') || errorMsg.includes('interact')) {
        this.isAudioBlocked = true;
        this.isPlaying = false;
        this.notifyListeners();
        return;
      }

      // Try CDN fallback
      const fallbackUrl = FALLBACK_CDN_URLS[muezzin.id];
      if (fallbackUrl && this.audioElement) {
        try {
          this.audioElement.src = fallbackUrl;
          this.audioElement.currentTime = 0;
          await this.audioElement.play();
          this.isPlaying = true;
          this.isAudioBlocked = false;
          this.notifyListeners();
        } catch (e2: unknown) {
          console.error('All audio sources blocked by browser policy:', e2);
          this.isPlaying = false;
          this.isAudioBlocked = true;
          this.notifyListeners();
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
    this.isAudioBlocked = false;
    this.notifyListeners();
  }

  /**
   * Get / store triggered history in localStorage to avoid duplicate alerts
   */
  private isAlreadyTriggered(key: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem('adhan_triggered_cache');
      const set = raw ? JSON.parse(raw) : [];
      return set.includes(key);
    } catch {
      return false;
    }
  }

  private markTriggered(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('adhan_triggered_cache');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(key)) {
        list.push(key);
        if (list.length > 25) list.shift();
        localStorage.setItem('adhan_triggered_cache', JSON.stringify(list));
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Main prayer monitor called every second by App.tsx
   */
  public checkAndTriggerPrayerAlert(
    prayerKey: PrayerKey,
    prayerNameAr: string,
    prayerNameFr: string,
    prayerTime: Date,
    settings: PrayerSettings
  ): void {
    if (settings.silentMode) return;

    const prayerConfig = settings.prayerSoundConfig[prayerKey];
    if (!prayerConfig?.enabled) return;

    const now = new Date();
    const diffMs = prayerTime.getTime() - now.getTime();
    const dateStr = prayerTime.toISOString().slice(0, 10);

    const isArabic = settings.language === 'ar';
    const prayerTitle = isArabic ? prayerNameAr : prayerNameFr;
    const soundFile = `adhan_${settings.selectedMuezzinId || 'algeria'}.mp3`;

    // 1. Exact prayer time trigger (Window: 5 seconds before to 3 minutes after)
    const exactKey = `exact_${prayerKey}_${dateStr}`;
    if (diffMs <= 5000 && diffMs >= -180000 && !this.isAlreadyTriggered(exactKey)) {
      this.markTriggered(exactKey);

      const notifTitle = isArabic
        ? `حان الآن موعد صلاة ${prayerTitle}`
        : `C'est l'heure de la prière de ${prayerTitle}`;
      const notifBody = isArabic
        ? `حي على الصلاة، حي على الفلاح (الله أكبر)`
        : `Accourez à la prière, accourez au succès`;

      // Trigger system notification with custom sound
      this.sendNotification(notifTitle, {
        body: notifBody,
        tag: exactKey,
        soundFile,
      });

      // Trigger active in-app visual alert overlay
      this.notifyAlertListeners({
        key: prayerKey,
        titleAr: prayerNameAr,
        titleFr: prayerNameFr,
        time: prayerTime,
      });

      // Play vocal adhan audio
      if (prayerConfig.playAdhan && settings.fullAdhanEnabled) {
        this.playMuezzin(settings.selectedMuezzinId);
      }
    }

    // 2. Pre-prayer alert
    if (settings.preNotificationMinutes > 0) {
      const preKey = `pre_${prayerKey}_${dateStr}_${settings.preNotificationMinutes}`;
      const targetPreMs = settings.preNotificationMinutes * 60000;
      if (
        diffMs <= targetPreMs + 10000 &&
        diffMs >= targetPreMs - 50000 &&
        !this.isAlreadyTriggered(preKey)
      ) {
        this.markTriggered(preKey);

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

  /**
   * Immediate interactive test alert (Audio + Notification + Vibreur + In-app Overlay)
   */
  public async triggerTestAlert(settings: PrayerSettings): Promise<boolean> {
    this.unlockAudio();
    const hasPerm = await this.requestNotificationPermission();

    const isArabic = settings.language === 'ar';
    const notifTitle = isArabic
      ? '🔔 اختبار الأذان: التنبيهات تعمل بنجاح'
      : "🔔 Test d'alerte Adhan : Tout fonctionne parfaitement";
    const notifBody = isArabic
      ? 'تم تفعيل التنبيه الصوتي والإشعار بنجاح لجميع الصلوات'
      : 'Les notifications et la récitation audio sont bien configurées';
    const soundFile = `adhan_${settings.selectedMuezzinId || 'algeria'}.mp3`;

    await this.sendNotification(notifTitle, { body: notifBody, soundFile });

    // In-app alert
    this.notifyAlertListeners({
      key: 'fajr',
      titleAr: isArabic ? 'اختبار الأذان (تجريبي)' : "Test d'alerte Adhan",
      titleFr: "Test d'alerte Adhan",
      time: new Date(),
      isTest: true,
    });

    // Play sound immediately
    await this.playMuezzin(settings.selectedMuezzinId);

    return hasPerm;
  }
}

export const notificationService = new AudioAndNotificationManager();
