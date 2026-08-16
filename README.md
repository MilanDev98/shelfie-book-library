# Shelfie

Shelfie turns a bookshelf photo into a structured personal library. The project uses one
Turborepo containing an Expo mobile app and a Django REST API.

This repository currently contains the project foundation, deterministic catalog matching, and
read-only catalog APIs. Book detection, AI extraction, review, and personal-library features have
not been implemented yet.

## Workspace

```text
apps/
├── api/       Django 6.1 + Django REST Framework + SQLite
└── mobile/    Expo SDK 57 + React Native + TypeScript + Expo Router
```

JavaScript packages are managed with pnpm. Python and the Django virtual environment are managed
with uv. Turbo runs commands across both applications.

## Requirements

- macOS for the current iOS development workflow
- Git
- nvm
- Node.js 22 (see `.nvmrc`)
- pnpm 10.34.5 through Corepack
- Python 3.12 (downloaded and managed by uv)
- uv
- Xcode and iOS Simulator for local iOS development
- Expo Go on the Simulator or physical iPhone

Confirm that the main tools are available:

```bash
git --version
nvm --version
uv --version
xcode-select -p
```

## Clone and select the development branch

For a new clone:

```bash
git clone git@github.com:MilanDev98/shelfie-book-library.git
cd shelfie-book-library
git switch develop
```

If the repository is already on the computer, do not clone it again. Use the existing project
folder and confirm the branch with `git branch --show-current`. Project work happens on
`develop`; `main` remains the stable branch.

## First-time setup

Run each command separately in Terminal.

### 1. Go to the project folder

```bash
cd shelfie-book-library
```

Terminal must be inside the cloned Shelfie repository before running project commands. If the
repository was cloned into a different folder name or location, use that path instead.

### 2. Use Node.js 22

```bash
nvm install
nvm use
```

`nvm install` installs the version from `.nvmrc` when needed. `nvm use` activates that version in
the current Terminal.

### 3. Enable pnpm

```bash
corepack enable
```

This makes the pnpm package manager available through Node.js.

### 4. Install JavaScript dependencies

```bash
pnpm install
```

This installs Turborepo, Expo, React Native, TypeScript, and the other JavaScript packages.

### 5. Install Python dependencies

```bash
uv sync --project apps/api --all-groups
```

This creates the Python environment and installs Django, Django REST Framework, Ruff, mypy, and
the testing tools.

### 6. Create the local environment file

```bash
test -f .env || cp .env.example .env
```

This creates `.env` from the example only when `.env` does not already exist. It will not
overwrite an existing configuration. Do not commit `.env`.

### 7. Prepare the Django database

```bash
uv --project apps/api run python apps/api/manage.py migrate
```

This creates the local SQLite database tables required by Django.

### 8. Import the book catalog

```bash
uv --project apps/api run python apps/api/manage.py import_catalog
```

This validates the repository-root `catalog.csv` and imports it into SQLite. Runtime matching
queries SQLite directly; it does not read the CSV. The command is safe to run repeatedly: existing
rows are updated only when their imported values change, unchanged rows are left alone, and the
command reports how many rows were created, updated, or unchanged.

Run this command again whenever `catalog.csv` changes. A new clone needs both `migrate` and
`import_catalog` before catalog matching can run.

### 9. Start Expo and Django

For normal mobile development, use two Terminal tabs. This keeps Expo interactive so its keyboard
controls work normally.

Terminal tab 1 — Django:

```bash
pnpm --filter @shelfie/api dev
```

Terminal tab 2 — Expo:

```bash
pnpm --filter @shelfie/mobile dev
```

In the Expo terminal:

- Press `i` to open the iOS Simulator.
- Press `w` to open the web app.
- Press `r` to reload the app.
- Press `?` to display all Expo controls.
- Press `Ctrl+C` to stop Expo.

If Expo asks to install the recommended Expo Go version, choose `Y`. The Expo Go version must
support the Expo SDK used by this project.

Alternatively, start both applications together through Turbo:

```bash
pnpm dev
```

Turbo starts Expo and Django together, but direct Expo keyboard controls are less convenient in
the combined output. Press `Ctrl+C` to stop both processes.

## Verify the API

Open `http://localhost:8000/api/v1/health`. It should return:

```json
{"status":"ok"}
```

The catalog must be migrated and imported before using the match endpoint. Follow first-time steps
7 and 8 above, then start Django.

### Match a title and author

Send JSON to `POST /api/v1/catalog/match`:

```bash
curl -X POST http://localhost:8000/api/v1/catalog/match \
  -H "Content-Type: application/json" \
  -d '{"title":"Dune","author":"Frank Herbert"}'
```

`title` is required and `author` is optional. A valid request returns HTTP 200 with one of these
statuses:

- `matched`: one confident catalog book is returned in `match`.
- `not_sure`: up to three safe candidate summaries are returned for human review.
- `not_found`: no reasonable catalog candidate was found.

Missing or invalid fields return HTTP 400 with field-specific validation messages. If the catalog
has not been imported, the endpoint returns HTTP 503 with the `catalog_not_initialized` error code.
The endpoint only matches supplied text; it does not accept or process photos.

### List or search the catalog

Use `GET /api/v1/catalog` to inspect catalog summaries. The optional `q` parameter searches IDs,
titles, authors, title aliases, author aliases, and editions. `limit` defaults to 10 and accepts
values from 1 through 50.

```bash
curl "http://localhost:8000/api/v1/catalog?q=Dune&limit=5"
```

The response contains the total matching `count` and a limited `results` list. Results expose only
catalog ID, title, author, and edition.

### Get one catalog book

Use `GET /api/v1/catalog/{catalog_id}` to retrieve one book's complete public catalog fields,
including alternate titles, author aliases, and contained titles.

```bash
curl http://localhost:8000/api/v1/catalog/B081
```

An unknown catalog ID returns HTTP 404 with the `catalog_book_not_found` error code.

For a physical iPhone, change `EXPO_PUBLIC_API_URL` to the development Mac's LAN address, such as
`http://192.168.x.x:8000`, and keep the phone and Mac on the same network.

## Verify the mobile app

After Expo starts:

1. Press `i` to open the iOS Simulator, or scan the QR code with a physical iPhone.
2. Allow Expo to install or update the recommended Expo Go version when prompted.
3. Confirm that the Shelfie starter screen opens without a red error screen.
4. Press `r` in the Expo terminal and confirm the app reloads.

The Mac and physical iPhone must be on the same Wi-Fi network. If the QR code cannot connect, make
sure macOS Firewall is not blocking Node or Expo and restart the Expo process.

## Daily development workflow

The full installation is normally required only once. On later days, open both Terminal tabs in
the repository root:

1. Open Terminal tab 1:

   ```bash
   nvm use
   pnpm --filter @shelfie/api dev
   ```

2. Open Terminal tab 2:

   ```bash
   nvm use
   pnpm --filter @shelfie/mobile dev
   ```

3. Press `i` in the Expo terminal or scan its QR code.
4. Press `Ctrl+C` in both terminals when finished.

Run `pnpm install` again after JavaScript dependencies change. Run
`uv sync --project apps/api --all-groups` after Python dependencies change. Run Django migrations
again after new database migrations are added. Run
`uv --project apps/api run python apps/api/manage.py import_catalog` after catalog CSV changes.

## Common development-server problems

If a port is already in use, another Expo or Django process is probably still running. Return to
the earlier Terminal and press `Ctrl+C` before starting the servers again.

If the Simulator reports that the project is incompatible with Expo Go, update Expo Go when Expo
prompts you, then reopen the project.

If Expo says port 8081 is already in use, do not start another copy on 8082 unless that is
intentional. Stop the earlier Expo process with `Ctrl+C`, then start it again.

If Django says port 8000 is already in use, stop the earlier Django process with `Ctrl+C` before
restarting it.

If Expo cannot find the Simulator, open Xcode once, accept any license or component-installation
prompts, and confirm that an iOS Simulator runtime is installed.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm build` exports the Expo web target and runs Django's system check. Production deployment
settings are intentionally not part of this initial scaffold.

Run all four commands before committing a completed development phase.

## Adding dependencies

Install Expo and React Native dependencies directly in the mobile application so native module
autolinking can find them:

```bash
pnpm --filter @shelfie/mobile exec expo install <package-name>
```

Add Django or Python dependencies through uv:

```bash
uv add --project apps/api <package-name>
```

Commit both lockfiles when dependencies change: `pnpm-lock.yaml` and `apps/api/uv.lock`.

## Git workflow

Check the current state before making a commit:

```bash
git branch --show-current
git status
```

Normal implementation work and setup improvements are committed on `develop`. Do not commit
`.env`, SQLite databases, virtual environments, `node_modules`, Expo build output, or caches.

## Catalog data flow

`catalog.csv` is the version-controlled source used to seed the canonical catalog. The
`import_catalog` command validates and copies those records into the `CatalogBook` SQLite table.
The deterministic matcher queries that table and returns `matched`, `not_sure`, or `not_found`.
Ambiguous editions, same-title books, omnibus relationships, aliases, and missing-author inputs
remain review cases instead of being silently accepted.

The API analysis endpoints, mobile capture workflow, local spine detector, hosted VLM, review
workflow, and personal-library persistence are later phases and are not part of this phase.
