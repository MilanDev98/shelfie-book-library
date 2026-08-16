# Shelfie Mobile

The Expo SDK 57 client for Shelfie. It keeps the approved Scan, Review, and Library screens and connects them to the local Django API.

## Configure the API URL

Create the ignored local mobile environment file without overwriting any existing file:

```bash
test -f apps/mobile/.env || cp apps/mobile/.env.example apps/mobile/.env
```

For the web preview or an iOS Simulator using Django on this Mac, either loopback
or the Mac's LAN address works. Using the LAN address keeps one configuration for
the simulator and a physical phone:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
```

In development, Shelfie automatically changes that local Django URL to
`127.0.0.1:8000` inside the iOS Simulator. A physical iPhone keeps the LAN
address from `.env`.

Both devices must be on the same Wi-Fi. Find the current LAN address with:

```bash
ipconfig getifaddr en0
```

Then set the result in `apps/mobile/.env`, for example:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
```

Also add that same address to `DJANGO_ALLOWED_HOSTS` in the repository-root `.env`, then restart Django. Start Django on the LAN interface:

```bash
uv --project apps/api run python apps/api/manage.py runserver 0.0.0.0:8000
```

Reload the native app after changing `EXPO_PUBLIC_API_URL`; Expo embeds
`EXPO_PUBLIC_*` values when it bundles the app. Do not put OpenRouter credentials
in this file or in any `EXPO_PUBLIC_*` variable. OpenRouter remains server-side
in Django's ignored root `.env` only.

## Run the client

From the repository root:

```bash
pnpm install
pnpm --filter @shelfie/mobile dev
```

This SDK 57 project uses a Shelfie development build rather than Expo Go. Install
and launch it on the local iOS Simulator with:

```bash
pnpm --filter @shelfie/mobile ios -- --device "iPhone 16e"
```

For a USB-connected iPhone with Developer Mode enabled:

```bash
pnpm --filter @shelfie/mobile ios:device
```

The first native run generates the iOS project and takes longer. Later JavaScript
and TypeScript changes use Fast Refresh through `pnpm --filter @shelfie/mobile dev`.

The app uses Expo Router routes under `src/app`. The Scan flow can take a camera photo or choose an image, upload it as multipart form data to `/api/v1/analyze/read`, map returned matches and candidates into the existing results/review states, and save confirmed catalog IDs through `/api/v1/library/books`. The Library tab loads `/api/v1/library/books` on entry and offers retry UI for API failures.

If the API URL is missing, the app shows a configuration error. Network failures, request timeouts, Django errors, missing catalog setup, and provider failures remain visible in the existing analysis error state; no secret or provider key is sent from the mobile app.

## Useful checks

```bash
pnpm --filter @shelfie/mobile typecheck
pnpm --filter @shelfie/mobile lint
pnpm --filter @shelfie/mobile build
```

The Django API and catalog setup are documented in the repository-root `README.md`.
