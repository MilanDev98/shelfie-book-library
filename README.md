# Shelfie

Shelfie is an Expo + Django take-home app that turns a bookshelf photo into a
reviewable, persistent personal library. The complete path is:

1. Take or choose a photo in the Expo app.
2. Upload it to Django REST Framework.
3. Detect book-spine regions locally with CPU-only OWLv2.
4. Send only the detected spine crops to a hosted vision-language model through
   OpenRouter to read title and author text.
5. Match each read against a deliberately messy 170-book catalog.
6. Add confident matches directly; confirm, correct, or discard uncertain reads.
7. Persist confirmed catalog books to SQLite and show them in the mobile library.

The project is intentionally single-user and local-development focused. Authentication and
deployment were outside the assignment scope.

## Architecture

```text
Expo camera / picker
        |
        | multipart shelf image
        v
Django POST /api/v1/analyze/read
        |
        +--> local OWLv2 on CPU --> up to 12 spine crops
        |                              |
        |                              | HTTPS, crops only
        |                              v
        |                         OpenRouter VLM
        |                              |
        +<-- title + author JSON <-----+
        |
        +--> deterministic fuzzy matcher --> matched / not_sure / not_found
                                             |
                                             v
                                   Expo review and correction
                                             |
                                             v
                                  SQLite saved-book library
```

- `apps/mobile`: Expo SDK 57, React Native, TypeScript, and Expo Router.
- `apps/api`: Django 6.1, Django REST Framework, SQLite, OWLv2, Pillow, and
  deterministic catalog matching.
- `catalog.csv`: version-controlled source catalog imported into SQLite.
- `test_photos`: the real shelf sample and zero-book control used during development.

The original image stays between the phone and Django. The hosted provider receives only the
numbered spine crops. Images, detections, and provider output are not persisted; only catalog IDs
explicitly confirmed by the user are saved.

## Clean-clone setup

### Requirements

- macOS with Xcode and an iOS Simulator for the documented native workflow
- Git and nvm
- Node.js 22 (`.nvmrc`)
- Corepack / pnpm 10.34.5
- [uv](https://docs.astral.sh/uv/)
- An OpenRouter API key with access to `google/gemini-2.5-flash`

Clone the repository and use the submission branch:

```bash
git clone git@github.com:MilanDev98/shelfie-book-library.git
cd shelfie-book-library
git switch develop
```

Install dependencies:

```bash
nvm install
nvm use
corepack enable
pnpm install
uv sync --project apps/api --all-groups
```

Create both ignored environment files:

```bash
test -f .env || cp .env.example .env
test -f apps/mobile/.env || cp apps/mobile/.env.example apps/mobile/.env
```

Edit the root `.env` and provide the server-only credential:

```dotenv
OPENROUTER_API_KEY=your-spend-capped-key
OPENROUTER_VISION_MODEL=google/gemini-2.5-flash
```

Never put this key in an `EXPO_PUBLIC_*` variable. For the iOS Simulator, keep
`apps/mobile/.env` at:

```dotenv
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

For a physical iPhone, replace the host with the Mac's LAN address and add that address to
`DJANGO_ALLOWED_HOSTS` in the root `.env`.

Prepare the database, catalog, and local model:

```bash
uv --project apps/api run python apps/api/manage.py migrate
uv --project apps/api run python apps/api/manage.py import_catalog
uv --project apps/api run python apps/api/manage.py warm_detector
```

`warm_detector` intentionally downloads the off-the-shelf
`google/owlv2-base-patch16-ensemble` weights once (about 620 MB) and verifies CPU loading.
Normal API requests use the ignored local cache and never train or fine-tune the model.

The app uses native modules and therefore runs in an Expo development build, not Expo Go. Build
and install it once:

```bash
pnpm --filter @shelfie/mobile exec expo run:ios --device "iPhone 16e"
```

Then run the two services in separate terminals:

```bash
# Terminal 1
pnpm --filter @shelfie/api dev
```

```bash
# Terminal 2
pnpm --filter @shelfie/mobile dev
```

Press `i` in the Expo terminal to open the installed development build. Restart Django after
changing any root `.env` provider setting.

## User flow and human review

High-confidence matches are shown as ready to add, but are not persisted until the user taps the
library action. `not_sure` results enter a first-class review screen. The user can:

- confirm the suggested catalog entry and save it immediately;
- search the supplied catalog and replace the suggestion; or
- discard the detection.

Unreadable and unmatched spines are never silently accepted or dropped. They have explicit states
with correction, discard, retry, and choose-another-photo actions. Manual arbitrary-book creation
was deliberately excluded because it would bypass the canonical catalog requirement.

The app also gives explicit screens for zero detections, upload/network errors, local model errors,
provider timeouts, and unreadable spines. Malformed provider JSON receives a structured API error
instead of producing partial or misordered matches.

## Matching against the messy catalog

`catalog.csv` contains 170 canonical rows. `import_catalog` validates required fields and unique
IDs, then idempotently imports the data into `CatalogBook`.

The matcher normalizes case, punctuation, accents, initials, and `Lastname, Firstname` ordering.
It scores every row using the best canonical, alternate, or contained-title similarity plus author
similarity:

```text
with author: 0.75 * title_similarity + 0.25 * author_similarity
no author:   title_similarity
```

Alternate titles receive a small source penalty and contained titles a larger one, so an omnibus
does not automatically beat its individual volume. A match must pass score, title, author, and
best-vs-second-place margin thresholds. Otherwise the API returns up to three review candidates;
weak reads become `not_found`.

Deliberate ambiguity includes:

- separate UK/US Harry Potter titles (`B001`, `B002`);
- separate illustrated and anniversary editions of *The Hobbit* (`B009`, `B010`);
- genuinely different books called *The Alchemist*, *Home*, and *The Power*;
- *The Lord of the Rings* and *The Chronicles of Narnia* omnibuses alongside their contained
  volumes;
- substring families such as *Dune* / *Dune Messiah* and *Foundation* / *Foundation and Empire*;
- author aliases such as `J. K. Rowling`, `J.K. Rowling`, `Joanne Rowling`, and `Rowling J. K.`.

## Local versus hosted routing

The local OWLv2 model is good at the bounded, privacy-sensitive geometry task: find likely spine
rectangles. It cannot reliably transcribe arbitrary typography. The hosted Gemini model receives
the small crops and handles OCR-like visual reading. The deterministic matcher—not the hosted
model—owns canonicalization and confidence, keeping matching testable and repeatable.

The request caps detections at 12. This bounds provider payload, latency, and cost. A truncated
result is visible in the Expo UI with guidance to scan one shelf at a time.

## Measured latency and estimated API cost

Measurements below were taken on the development Mac with cached OWLv2 weights, Django's local
development server, threshold `0.3`, and the committed files in `test_photos/`. They are one-run
engineering measurements, not benchmark claims.

| Image | Result | Cached CPU inference | Django processing | HTTP elapsed |
| --- | ---: | ---: | ---: | ---: |
| `bookshelf-sample.webp` (3627 x 2720) | 12 detections, truncated | 3101.74 ms | 3815.81 ms | 3.97 s |
| `no-books-control.jpg` (640 x 480) | 0 detections | included in total | no provider call | 2.52 s |

The zero-book path intentionally skips OpenRouter. A real billable OpenRouter request was not made
for this repository snapshot, so hosted latency is explicitly still to be measured with the final
spend-capped key before submission.

Cost estimate for the worst-case 12-crop request:

- Gemini image inputs up to 384 x 384 count as 258 tokens; larger inputs are tiled in 768 x 768
  units at 258 tokens. The narrow spine crops are estimated at 258-516 tokens each, or
  3,096-6,192 image-input tokens total.
- OpenRouter currently lists `google/gemini-2.5-flash` at $0.30 per million input tokens and $2.50
  per million output tokens.
- Estimated image-input cost: **$0.00093-$0.00186 per shelf image**.
- Allowing up to 500 output tokens for compact JSON adds at most **$0.00125**.
- Estimated worst-case model total: **$0.00218-$0.00311 per shelf image** (roughly 0.22-0.31 cents),
  before any credit-purchase fee.

Pricing and token rules change; verify the
[OpenRouter model page](https://openrouter.ai/google/gemini-2.5-flash) and
[Gemini image token documentation](https://ai.google.dev/gemini-api/docs/image-understanding)
before presenting the number.

## API summary

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/analyze` | Local CPU spine detection only |
| `POST` | `/api/v1/analyze/read` | Detection, hosted reading, and catalog matching |
| `POST` | `/api/v1/catalog/match` | Match supplied title/author text |
| `GET` | `/api/v1/catalog?q=...` | Search correction candidates |
| `GET` | `/api/v1/catalog/{catalog_id}` | Full catalog detail |
| `GET/POST` | `/api/v1/library/books` | List or save confirmed books |
| `DELETE` | `/api/v1/library/books/{catalog_id}` | Remove a saved book |

Uploads accept JPEG, PNG, and WebP, up to 10 MB and 40 megapixels. Filename, MIME type, and actual
image content must agree. Temporary images and crops are removed after each request.

## Test photos

- `test_photos/bookshelf-sample.webp`: positive local-detector and truncation test.
- `test_photos/no-books-control.jpg`: generated blank control for the zero-detection path.

The assignment's live presentation photos are intentionally not included because they will be
provided by the reviewers at demo time.

## Quality checks

Run all checks from the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The Django suite includes real matching cases, messy-catalog ambiguity, catalog import and lookup,
library persistence, image validation, detector post-processing, provider JSON validation,
zero-detection routing, timeouts, and malformed responses.

## Key decisions and tradeoffs

- **Crops instead of the full photo:** less hosted data and bounded cost, but detector misses cannot
  be recovered by the VLM.
- **Deterministic matching:** explainable scores and stable tests, at the cost of less semantic
  flexibility than embeddings or an LLM matcher.
- **SQLite and a single library:** enough to prove persistence; no authentication or multi-user
  isolation.
- **Twelve-detection cap:** predictable demo latency and cost; large shelves require multiple
  scans.
- **No arbitrary manual entries:** correction remains tied to the supplied canonical catalog;
  out-of-catalog books are discarded.
- **No image persistence:** better privacy and a smaller data model; the app cannot later show the
  original crop for saved books.

## Unfinished and another day

Before sending the repository link, run one authorized end-to-end request with the spend-capped
OpenRouter key and record actual provider/full-pipeline latency, returned titles, token usage, and
billed cost. This snapshot includes the complete provider integration and mocked failure tests but
does not claim a billable external call that was not made.

With another day I would add a small recorded native E2E suite, batch/retry hosted crops separately
so one provider failure does not repeat local inference, retain short-lived crop IDs for richer
review, and measure accuracy across more real cluttered shelves. I would not add authentication or
deployment unless the product scope changed.

## Submission discipline

Development is committed on `develop`. Submit the exact branch URL or make `develop` the GitHub
default branch. After sending the repository link, do not commit again; the assignment explicitly
requires the presented repository to match the submitted snapshot.
