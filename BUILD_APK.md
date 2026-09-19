# How to Build the Android APK

Two options are available: **PWA install** (easiest) and **real APK** via Capacitor.

---

## Option 1 — PWA "Install to Home Screen" (Easiest, No APK needed)

Users can install the app directly from Chrome — no APK download needed.

### Steps:
1. Deploy the app (or run it locally on your network)
2. Open Chrome on Android and visit the app URL
3. Tap the **⋮ menu → Add to Home Screen**
4. The app installs like a native app (full screen, no browser bar)

> The app already has PWA support with a service worker, manifest, and offline caching.

---

## Option 2 — Real APK with Capacitor

This produces an actual `.apk` file you can share and install directly.

### Prerequisites (install on your computer)
- [Java JDK 17+](https://adoptium.net/)
- [Android Studio](https://developer.android.com/studio) (includes Android SDK)
- Node.js 18+

### Steps

#### Step 1 — Set your server URL

Edit `client/capacitor.config.ts` and set your server URL:

```typescript
server: {
  url: 'http://192.168.1.100:5000',  // your PC's local IP (for local network)
  // OR for deployed server:
  // url: 'https://your-app.onrender.com',
  androidScheme: 'https',
},
```

> **Local network**: Find your PC's IP with `ipconfig` (Windows) or `ip addr` (Linux/Mac)
> **Production**: Deploy the server to Render/Railway first, then use that URL

#### Step 2 — Add the Android platform (first time only)

```bash
cd client
npx cap add android
```

#### Step 3 — Build the web app and sync to Android

```bash
cd client
npm run build
npx cap sync android
```

#### Step 4 — Build the APK

**Option A: Command line (faster)**
```bash
cd client/android
./gradlew assembleDebug        # Linux/Mac
gradlew.bat assembleDebug      # Windows
```

APK will be at: `client/android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Android Studio (easier)**
```bash
cd client
npx cap open android
```
Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

#### Step 5 — Install on phone

Send the `.apk` file to the phone (WhatsApp, email, USB cable), then:
1. On the phone: Settings → Security → Enable **Install unknown apps**
2. Open the APK file → Install

---

## Building a Release APK (for sharing/distribution)

The debug APK works fine for testing. For a release version:

```bash
cd client/android
./gradlew assembleRelease
```

You'll need to sign it with a keystore. Android Studio's **Generate Signed Bundle/APK** wizard makes this easy.

---

## Updating the APK

When you change the app, rebuild and sync:

```bash
cd client
npm run build
npx cap sync android
```

Then build the APK again (Step 4).
