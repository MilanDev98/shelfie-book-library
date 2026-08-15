# Shelfie

Shelfie turns a bookshelf photo into a structured personal library. The project uses one
Turborepo containing an Expo mobile app and a Django REST API.

This repository currently contains the basic project setup only. Book detection, AI extraction,
catalog matching, review, and library features have not been implemented yet.

## Workspace

```text
apps/
├── api/       Django 6.1 + Django REST Framework + SQLite
└── mobile/    Expo SDK 57 + React Native + TypeScript + Expo Router
```

JavaScript packages are managed with pnpm. Python and the Django virtual environment are managed
with uv. Turbo runs commands across both applications.

## Requirements

- Node.js 22 (see `.nvmrc`)
- pnpm 10.34.5 through Corepack
- Python 3.12 (downloaded and managed by uv)
- uv
- Xcode and iOS Simulator for local iOS development

## Install

```bash
nvm install
nvm use
corepack enable
pnpm install
uv sync --project apps/api --all-groups
uv --project apps/api run python apps/api/manage.py migrate
cp .env.example .env
```

The default values work for localhost development. Do not commit `.env`.

## Run both applications

```bash
pnpm dev
```

Turbo starts:

- Expo development server from `apps/mobile`
- Django at `http://localhost:8000`

Verify Django at `http://localhost:8000/api/v1/health`. It should return:

```json
{"status":"ok"}
```

To run only one application:

```bash
pnpm --filter @shelfie/mobile dev
pnpm --filter @shelfie/api dev
```

For a physical iPhone, change `EXPO_PUBLIC_API_URL` to the Mac's LAN address, such as
`http://192.168.1.10:8000`, and keep the phone and Mac on the same network.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm build` exports the Expo web target and runs Django's system check. Production deployment
settings are intentionally not part of this initial scaffold.
