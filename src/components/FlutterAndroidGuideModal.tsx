import React, { useState } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  Terminal,
  FileCode,
  Download,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { Language } from '../types/prayer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const FlutterAndroidGuideModal: React.FC<Props> = ({ isOpen, onClose, language }) => {
  const isArabic = language === 'ar';
  const [activeTab, setActiveTab] = useState<'main' | 'pubspec' | 'manifest' | 'commands' | 'twa'>('main');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const pubspecCode = `name: adhan_algerie
description: Application mobile moderne pour les heures de prière en Algérie et le monde
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # Calcul précis des heures de prière (formule Batoul Apps / MWL)
  adhan_dart: ^2.0.1

  # Notifications locales et alarmes d'Adhan
  flutter_local_notifications: ^17.2.1+2
  timezone: ^0.9.4

  # Lecture audio de l'Adhan
  audioplayers: ^6.0.0

  # Géolocalisation GPS
  geolocator: ^12.0.0

  # Stockage local des préférences (Wilaya, notifications, paramètres)
  shared_preferences: ^2.2.3

  # Formatage des dates et calendrier hégirien
  intl: ^0.19.0
  hijri: ^3.0.0

  # Icônes modernes
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/audio/adhan_makkah.mp3
    - assets/audio/adhan_algeria.mp3
    - assets/audio/adhan_madinah.mp3
    - assets/images/mosque_hero.jpg
`;

  const manifestCode = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.adhan.algeria.prayer_times">

    <!-- Permissions requises pour les notifications d'Adhan et alarmes exactes -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
    <uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
    <uses-permission android:name="android.permission.WAKE_LOCK"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"/>

    <application
        android:label="آذان – Adhan"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:showWhenLocked="true"
        android:turnScreenOn="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize"
            android:showWhenLocked="true"
            android:turnScreenOn="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>

        <!-- Receiver pour reprogrammer les alarmes après redémarrage du téléphone -->
        <receiver
            android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED"/>
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>
                <action android:name="android.intent.action.QUICKBOOT_POWERON"/>
            </intent-filter>
        </receiver>

        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>`;

  const mainDartCode = `import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:adhan_dart/adhan_dart.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initNotifications();
  runApp(const AdhanApp());
}

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> initNotifications() async {
  const AndroidInitializationSettings initializationSettingsAndroid =
      AndroidInitializationSettings('@mipmap/ic_launcher');
  const InitializationSettings initializationSettings =
      InitializationSettings(android: initializationSettingsAndroid);
  await flutterLocalNotificationsPlugin.initialize(initializationSettings);
}

class AdhanApp extends StatelessWidget {
  const AdhanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'آذان – Adhan Algérie',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar'), Locale('fr')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF021A14),
        primaryColor: const Color(0xFF064E3B),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF59E0B),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF064E3B),
        ),
        fontFamily: 'Cairo',
      ),
      home: const PrayerHomeScreen(),
    );
  }
}

class PrayerHomeScreen extends StatefulWidget {
  const PrayerHomeScreen({super.key});

  @override
  State<PrayerHomeScreen> createState() => _PrayerHomeScreenState();
}

class _PrayerHomeScreenState extends State<PrayerHomeScreen> {
  final AudioPlayer _audioPlayer = AudioPlayer();
  Timer? _timer;
  DateTime _now = DateTime.now();

  // Coordonnées par défaut : Alger (36.7538° N, 3.0588° E)
  double latitude = 36.7538;
  double longitude = 3.0588;
  String cityName = 'الجزائر العاصمة (Alger)';

  PrayerTimes? prayerTimes;
  String nextPrayerName = 'الفجر';
  Duration remainingTime = Duration.zero;
  bool isPlayingAdhan = false;

  @override
  void initState() {
    super.initState();
    _calculatePrayers();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _now = DateTime.now();
        _updateCountdown();
      });
    });
  }

  void _calculatePrayers() {
    final coordinates = Coordinates(latitude, longitude);
    // Standard officiel en Algérie : Muslim World League (18° Fajr, 17° Isha)
    final params = CalculationMethodParameters.muslimWorldLeague();
    params.madhab = Madhab.shafi; // Malékite / standard ombre 1

    prayerTimes = PrayerTimes(
      coordinates: coordinates,
      date: _now,
      calculationParameters: params,
    );
    _updateCountdown();
  }

  void _updateCountdown() {
    if (prayerTimes == null) return;
    final now = DateTime.now();
    final times = [
      MapEntry('الفجر', prayerTimes!.fajr),
      MapEntry('الظهر', prayerTimes!.dhuhr),
      MapEntry('العصر', prayerTimes!.asr),
      MapEntry('المغرب', prayerTimes!.maghrib),
      MapEntry('العشاء', prayerTimes!.isha),
    ];

    MapEntry<String, DateTime?>? next;
    for (final entry in times) {
      if (entry.value != null && entry.value!.isAfter(now)) {
        next = entry;
        break;
      }
    }

    if (next != null) {
      nextPrayerName = next.key;
      remainingTime = next.value!.difference(now);
    } else {
      nextPrayerName = 'الفجر (غداً)';
      final tomorrowFajr = prayerTimes!.fajr?.add(const Duration(days: 1));
      remainingTime = tomorrowFajr?.difference(now) ?? Duration.zero;
    }
  }

  Future<void> _playAdhan() async {
    if (isPlayingAdhan) {
      await _audioPlayer.stop();
      setState(() => isPlayingAdhan = false);
    } else {
      setState(() => isPlayingAdhan = true);
      await _audioPlayer.play(
        UrlSource('https://cdn.islamicfinder.org/prayer/audio/adhan/adhan11.mp3'),
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _audioPlayer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat('HH:mm');
    final secondsRemaining = remainingTime.inSeconds;
    final hours = (secondsRemaining ~/ 3600).toString().padLeft(2, '0');
    final minutes = ((secondsRemaining % 3600) ~/ 60).toString().padLeft(2, '0');
    final seconds = (secondsRemaining % 60).toString().padLeft(2, '0');

    return Scaffold(
      appBar: AppBar(
        title: const Text('آذان – أوقات الصلاة', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF064E3B),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(isPlayingAdhan ? Icons.volume_off : Icons.volume_up),
            onPressed: _playAdhan,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Hero Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF064E3B), Color(0xFF022C22)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
              ),
              child: Column(
                children: [
                  Text(cityName, style: const TextStyle(fontSize: 16, color: Color(0xFFFDE68A))),
                  const SizedBox(height: 12),
                  Text('الصلاة القادمة: $nextPrayerName',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  Text('$hours:$minutes:$seconds',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Color(0xFFF59E0B))),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Liste des prières
            if (prayerTimes != null) ...[
              _buildPrayerTile('الفجر', prayerTimes!.fajr != null ? formatter.format(prayerTimes!.fajr!) : '--:--'),
              _buildPrayerTile('الشروق', prayerTimes!.sunrise != null ? formatter.format(prayerTimes!.sunrise!) : '--:--'),
              _buildPrayerTile('الظهر', prayerTimes!.dhuhr != null ? formatter.format(prayerTimes!.dhuhr!) : '--:--'),
              _buildPrayerTile('العصر', prayerTimes!.asr != null ? formatter.format(prayerTimes!.asr!) : '--:--'),
              _buildPrayerTile('المغرب', prayerTimes!.maghrib != null ? formatter.format(prayerTimes!.maghrib!) : '--:--'),
              _buildPrayerTile('العشاء', prayerTimes!.isha != null ? formatter.format(prayerTimes!.isha!) : '--:--'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPrayerTile(String name, String time) {
    final isNext = nextPrayerName.contains(name);
    return Card(
      color: isNext ? const Color(0xFF064E3B) : const Color(0xFF03221A),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isNext ? const Color(0xFFF59E0B) : Colors.transparent),
      ),
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListTile(
        title: Text(name, style: TextStyle(fontWeight: FontWeight.bold, color: isNext ? const Color(0xFFF59E0B) : Colors.white)),
        trailing: Text(time, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
      ),
    );
  }
}
`;

  const commandsCode = `# 1. Créer le projet Flutter Android
flutter create --org com.adhan.algeria adhan_app
cd adhan_app

# 2. Remplacer pubspec.yaml et installer les dépendances
flutter pub get

# 3. Compiler l'APK pour Android en mode Release
flutter build apk --release

# L'APK installable sera généré dans :
# build/app/outputs/flutter-apk/app-release.apk

# 4. Installer directement sur votre smartphone Android branché en USB :
adb install build/app/outputs/flutter-apk/app-release.apk

# 5. Ou compiler un App Bundle (AAB) pour le Google Play Store :
flutter build appbundle --release
`;

  const twaCode = `# Alternative immédiate : Générer un APK Android natif directement depuis cette PWA en 2 minutes avec Bubblewrap (outil officiel de Google) :

# 1. Installer Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Initialiser le projet Android à partir de l'URL de votre application
bubblewrap init --manifest="https://ais-pre-lkmaqiodfwa6u5jspvwwv6-609379134540.europe-west1.run.app/manifest.json"

# 3. Compiler l'APK Android
bubblewrap build

# Le fichier APK installable sur tous les smartphones Android est prêt dans votre dossier !
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-5">
      <div className="w-full max-w-4xl rounded-3xl bg-emerald-950 border border-amber-500/40 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isArabic ? 'مشروع Flutter وكود تطبيق Android APK' : 'Projet Flutter Android & Génération APK'}
              </h3>
              <p className="text-xs text-emerald-300/80">
                {isArabic
                  ? 'الكود المصدري الكامل بلغة Dart مع خطوات التجميع لملف APK'
                  : 'Code Dart complet, dépendances et commandes de compilation APK'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-emerald-800/60 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2.5 bg-emerald-900/50 border-b border-emerald-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'main'
                ? 'bg-amber-400 text-emerald-950 shadow-sm'
                : 'bg-emerald-950 text-slate-300 hover:bg-emerald-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>lib/main.dart</span>
          </button>
          <button
            onClick={() => setActiveTab('pubspec')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pubspec'
                ? 'bg-amber-400 text-emerald-950 shadow-sm'
                : 'bg-emerald-950 text-slate-300 hover:bg-emerald-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>pubspec.yaml</span>
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'manifest'
                ? 'bg-amber-400 text-emerald-950 shadow-sm'
                : 'bg-emerald-950 text-slate-300 hover:bg-emerald-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>AndroidManifest.xml</span>
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'commands'
                ? 'bg-amber-400 text-emerald-950 shadow-sm'
                : 'bg-emerald-950 text-slate-300 hover:bg-emerald-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Compilation APK</span>
          </button>
          <button
            onClick={() => setActiveTab('twa')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'twa'
                ? 'bg-amber-400 text-emerald-950 shadow-sm'
                : 'bg-emerald-950 text-slate-300 hover:bg-emerald-900'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>PWA to APK (TWA)</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-4 relative font-mono text-xs">
          {activeTab === 'main' && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800 text-slate-400">
                <span>Code complet lib/main.dart (Flutter & adhan_dart)</span>
                <button
                  onClick={() => copyToClipboard(mainDartCode, 'main')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-300 transition cursor-pointer"
                >
                  {copiedKey === 'main' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'main' ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <pre className="text-emerald-100 whitespace-pre leading-relaxed select-all">
                {mainDartCode}
              </pre>
            </div>
          )}

          {activeTab === 'pubspec' && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800 text-slate-400">
                <span>Fichier pubspec.yaml</span>
                <button
                  onClick={() => copyToClipboard(pubspecCode, 'pubspec')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-300 transition cursor-pointer"
                >
                  {copiedKey === 'pubspec' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pubspec' ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <pre className="text-emerald-100 whitespace-pre leading-relaxed select-all">
                {pubspecCode}
              </pre>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800 text-slate-400">
                <span>android/app/src/main/AndroidManifest.xml (Permissions & Alarmes d'Adhan)</span>
                <button
                  onClick={() => copyToClipboard(manifestCode, 'manifest')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-300 transition cursor-pointer"
                >
                  {copiedKey === 'manifest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'manifest' ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <pre className="text-emerald-100 whitespace-pre leading-relaxed select-all">
                {manifestCode}
              </pre>
            </div>
          )}

          {activeTab === 'commands' && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800 text-slate-400">
                <span>Commandes de build APK Flutter</span>
                <button
                  onClick={() => copyToClipboard(commandsCode, 'commands')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-300 transition cursor-pointer"
                >
                  {copiedKey === 'commands' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'commands' ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <pre className="text-amber-200 whitespace-pre leading-relaxed select-all">
                {commandsCode}
              </pre>
            </div>
          )}

          {activeTab === 'twa' && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-800 text-slate-400">
                <span>Google Bubblewrap (TWA) - Transformer cette PWA en APK Android en 2 min</span>
                <button
                  onClick={() => copyToClipboard(twaCode, 'twa')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-300 transition cursor-pointer"
                >
                  {copiedKey === 'twa' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'twa' ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>
              <pre className="text-emerald-200 whitespace-pre leading-relaxed select-all">
                {twaCode}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
