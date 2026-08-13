---
name: IslandCity Android app
description: Expo mobile app for IslandCity drivers — architecture, color system, networking, and key constraints
---

## Structure
- `artifacts/islandcity-android/` — Expo artifact, slug `islandcity-android`
- 3 tabs: DASH (`index.tsx`), LIMOSYS (`limosys.tsx`), AI (`chat.tsx`)
- `utils/api.ts` — shared fetch helper using `EXPO_PUBLIC_DOMAIN`
- `constants/colors.ts` — forced dark theme (black bg, gold primary `#d9b64f`)

## Networking
- `EXPO_PUBLIC_DOMAIN` is injected automatically by the dev script (`$REPLIT_DEV_DOMAIN`) — no `.env` file needed
- API base: `https://${process.env.EXPO_PUBLIC_DOMAIN}`
- LimoSys: `POST /api/limosys-eval` with `{ imageBase64, mimeType, minHourly, minPerMile }`
- Chat: `POST /api/gemini-chat` with `{ message, history, context }`

## Data persistence
- Dashboard trips stored in AsyncStorage (`ic-android-trips`, `ic-android-goal`)
- NOT synced with web app or PostgreSQL (Task #65 covers sync)

## Key packages
- `expo-image-picker` — installed, used in LIMOSYS tab for gallery photo selection
- `react-native-keyboard-controller` — used in Chat tab for keyboard avoidance

## Constraints
- Runs in Expo Go on device — user scans QR from the URL bar dropdown
- No standalone APK yet (Task #66 covers EAS Build)
- No SYSTEM_ALERT_WINDOW overlay yet (Task #67 — requires native module beyond Expo Go)
- `expo-image-picker` needs `READ_MEDIA_IMAGES` permission on Android — handled automatically by `requestMediaLibraryPermissionsAsync()`

**Why dark-only theme:** The `colors.light` and `colors.dark` objects are set identically (both pure black) so the app is always dark regardless of OS setting, matching IslandCity's web app aesthetic.
