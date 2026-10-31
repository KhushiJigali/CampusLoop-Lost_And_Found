# Campus Loop — ML-Based Campus Lost & Found

A complete local React + Express + Mongoose application for a college campus. MongoDB is the primary persistent database. There are no mock API responses or browser-only report records. Startup fails if MongoDB is unavailable. Accounts, reports, locations and computed matches are stored as documents.

## What works

- Register/sign in as student or staff; hashed passwords and 12-hour signed sessions. Only the reporter or an administrator can edit/delete a report.
- Create, read, edit, delete, reopen and mark lost/found reports Returned, with a confirmation dialog.
- Optional brand/model/color, custom text attributes and local JPEG/PNG/WebP uploads (5 MB); MongoDB stores only the image path.
- Indexed server-side keyword, category, campus location, status and date filtering with pagination.
- Automatic local sentence-embedding/cosine matching with TF-IDF fallback on report creation/change/deletion, persisted in `matches`; top five suggestions on each report, top 50 campus pairs on the matches page.
- Live MongoDB aggregation dashboard. Returned counts are **report counts**, not unique physical items.
- All 17 required campus locations, stored in MongoDB. Optional GeoJSON schema, `2dsphere` index and proximity endpoint, with no invented coordinates.

## Stack and architecture

Node.js 18.20+ (20+ also supported), React 18, Vite 6, Express 4, Mongoose 8, MongoDB 7/8. Matching is implemented in JavaScript; Python or an external ML service is unnecessary.

Verified locally with the installed MongoDB 8.2 binary. If your test runner cannot download MongoDB, point it at your installed binary before running integration tests:

```powershell
$env:MONGOMS_SYSTEM_BINARY='C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe'
$env:MONGOMS_SYSTEM_BINARY_VERSION_CHECK='false'
npm run test:integration
```

```text
React forms / search / dashboard
        ↓ HTTP /api
Express routes → validation + account ownership
        ↓
Mongoose models → MongoDB campus_lost_found
        ↓                    ↓
Local sentence matching  aggregation pipelines
        ↓
matches collection → ranked explanations → React
```

`client/src/main.jsx` contains pages, `client/src/styles.css` the responsive design. `server/config/db.js` owns the connection. `server/models` owns schemas/indexes. `server/controllers/itemController.js` implements CRUD. `server/services` separates pure matching from persistence. `server/routes` contains REST, search and aggregation routes. `server/uploads` contains local image files. `server/tests` contains meaningful unit and real-database integration tests.

## Windows setup

Install Node.js and **MongoDB Community Server**. MongoDB Compass is optional; `mongosh` is installed separately if you want shell verification. The commands below run in PowerShell from this project directory.

1. Start MongoDB. If installed as a Windows service, run this in an Administrator PowerShell:

```powershell
Start-Service MongoDB
Get-Service MongoDB
```

Alternatively, run `mongod` in a separate terminal (adjust the installed version path if necessary):

```powershell
New-Item -ItemType Directory -Force .mongo-data
& 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe' --dbpath "$PWD\.mongo-data" --bind_ip 127.0.0.1 --port 27017
```

2. Install dependencies and configure the backend:

```powershell
npm install
Copy-Item server/.env.example server/.env
$campusSecret = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
(Get-Content server/.env) -replace '^JWT_SECRET=.*', "JWT_SECRET=$campusSecret" | Set-Content server/.env
```

`server/.env` must contain:

```dotenv
MONGODB_URI=mongodb://localhost:27017/campus_lost_found
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your-random-secret-at-least-32-characters
```

The URI is read exclusively from the environment. For Atlas, replace it with your Atlas URI, select database `campus_lost_found`, configure the Atlas network allowlist, and use an Atlas database user. Never commit `.env`. Application accounts are distinct from MongoDB database users.

3. Seed and run:

```powershell
npm run model:prepare
npm run seed
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). API runs on port 5000. Expected logs:

```text
MongoDB connected successfully
Server running on port 5000
```

Seed login: `demo@campus.example` / `CampusDemo123!`. Create your own account for new reports. This is a local academic demonstration account, not a production credential. Seeding inserts 17 lost and 9 found reports, including deliberately close wallet, bottle, earphone and ID pairs. It is idempotent, uses dates relative to the seed day and does not delete or overwrite user reports. The campus locations are also inserted on normal startup.

Separate terminals instead of `npm run dev`:

```powershell
npm run dev -w server
```

```powershell
npm run dev -w client
```

For a built application served by Express:

```powershell
npm run build
npm start
```

Open [http://localhost:5000](http://localhost:5000). In development Vite proxies `/api` and `/uploads` to Express. All report operations use this API and MongoDB.

## Verify the database and application

```powershell
npm test
npm run test:semantic
npm run test:integration
npm run verify:db
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5000/api/locations
Invoke-RestMethod 'http://localhost:5000/api/search?q=wallet&status=active'
Invoke-RestMethod http://localhost:5000/api/dashboard
```

Integration tests launch an **actual temporary mongod process**, isolated from your local application database, using `mongodb-memory-server`. The first run downloads the MongoDB binary and requires internet access, unless MONGOMS_SYSTEM_BINARY points to an installed mongod. Run npm run model:prepare before the semantic/integration tests; those tests use the cached model without downloading. It is not a fake in-memory repository. Tests insert and retrieve a report through Express/Mongoose, check ownership, persisted matching, keyword search, aggregation, indexes, invalid locations, statuses, deletion and idempotent seed data. They stop and remove the temporary database afterward.

Manual HTTP write/read verification (backend and local MongoDB must be running):

```powershell
$campusSession = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -ContentType 'application/json' -Body '{"email":"demo@campus.example","password":"CampusDemo123!"}'
$campusHeaders = @{ Authorization = "Bearer $($campusSession.token)" }
$campusReport = @{title='Verification wallet';description='Black leather wallet containing college ID';category='Wallet';color='Black';campus_location='B Block';date_lost=(Get-Date).ToString('yyyy-MM-dd')} | ConvertTo-Json
$campusSaved = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/lost -Headers $campusHeaders -ContentType 'application/json' -Body $campusReport
Invoke-RestMethod "http://localhost:5000/api/lost/$($campusSaved._id)"
Invoke-RestMethod "http://localhost:5000/api/matches/$($campusSaved._id)"
```

Inspect directly in MongoDB (install `mongosh` or use Compass at the same URI):

```powershell
mongosh 'mongodb://localhost:27017/campus_lost_found' --eval 'db.getCollectionNames()'
mongosh 'mongodb://localhost:27017/campus_lost_found' --eval 'db.lost_items.find({title:"Verification wallet"}).toArray()'
mongosh 'mongodb://localhost:27017/campus_lost_found' --eval 'db.lost_items.getIndexes()'
mongosh 'mongodb://localhost:27017/campus_lost_found' --eval 'db.lost_items.find({$text:{$search:"wallet"}}).toArray()'
mongosh 'mongodb://localhost:27017/campus_lost_found' --eval 'db.lost_items.aggregate([{$group:{_id:"$campus_location",count:{$sum:1}}},{$sort:{count:-1}}]).toArray()'
mongosh 'mongodb://localhost:27017/campus_lost_found' --eval 'db.matches.find().sort({final_score:-1}).limit(5).toArray()'
mongosh 'mongodb://localhost:27017/campus_lost_found' --eval 'db.campus_locations.find().toArray()'
```

## NoSQL concepts and where they are implemented

| Concept | Implementation |
| --- | --- |
| Document storage | `users`, `lost_items`, `found_items`, `matches`, `campus_locations` collections, defined under `server/models` |
| Flexible schema | Optional brand/model/color/features; `extra_attributes` Mongoose Map for different item-specific keys in `models/itemSchema.js`; seed includes bottle capacity/material |
| CRUD | `controllers/itemController.js`: create/find/save/deleteOne with owner authorization |
| Indexes | Category+status, location+status, status, event date, reporter+created date; text index on title/description/features; unique email and unique match pair |
| Querying | `routes/searchRoutes.js` applies indexed `$match` in each collection, then `$unionWith`, sorting, `$facet` pagination; `controllers/itemController.js` implements per-type query endpoints |
| Aggregation | `routes/dashboardRoutes.js`: `$unionWith`, `$facet`, `$group`, `$sum`, `$cond`, `$sort`; all totals come from MongoDB |
| Relationships | ObjectId references from reports to users and from matches to lost/found reports, populated for display |
| Geospatial | Optional GeoJSON Point on campus locations + `2dsphere` index; `GET /api/search?near=B%20Block&radius=300` resolves nearby campus location documents with `$near` and filters reports by their names |

Coordinates must be verified before adding them to campus location documents as `{type:"Point",coordinates:[longitude,latitude]}`. The proximity API returns HTTP 422 until the selected location has verified coordinates. It does not invent campus geography. Standard location filtering and matching work immediately.

## Matching methodology

All score configuration lives in `server/config/constants.js`. The backend runs the quantized `Xenova/all-MiniLM-L6-v2` sentence model locally on the CPU through Transformers.js. It mean-pools and normalizes sentence embeddings, compares them with cosine similarity, and blends 90% semantic cosine with 10% vocabulary-normalized TF-IDF cosine for the description component. Embeddings are cached per text within the process. No report text is sent to a paid or remote inference API. The model download itself comes from Hugging Face on first setup.

[Transformers.js pipeline documentation](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/pipelines.md) describes feature extraction; the [model repository](https://huggingface.co/Xenova/all-MiniLM-L6-v2) supplies the local ONNX weights.

`services/semanticService.js` loads the model once, caches vectors and reports model availability. `services/matchingService.js` calculates each component. If model loading/inference fails, it uses normalized TF-IDF and labels saved matches `tfidf-fallback`; it does not pretend embeddings were used. Restart after repairing the cache/network to retry model loading. Set `MATCH_EMBEDDINGS=false` to force the fallback. Set `MATCH_LOCAL_FILES_ONLY=true` after preparing the model for offline-only loading. Model files are cached under `server/.model-cache`, excluded from Git; `MATCH_MODEL_CACHE` can override that directory.

| Component | Base weight | Evidence |
| --- | --- | --- |
| Description | 40% | Local sentence cosine + TF-IDF blend; TF-IDF alone as labelled fallback |
| Category | 15% | Exact category agreement |
| Attributes | 15% | Mean agreement of shared color/brand/model plus unique-features similarity when both supplied |
| Location | 15% | Campus agreement; within the same campus location, 85% campus + 15% specific-location similarity if both supplied |
| Date | 10% | exp(-days after loss / 14); zero if found before loss |
| Image | 5% | Unavailable: stored as null with zero effective weight |

The final score is `sum(weight × available component) / sum(available weights)`. Missing comparable attributes and unavailable image comparison are excluded, not scored as disagreements. Individual missing brand/model fields are not included in the attribute denominator. Shared but contradictory fields remain evidence and lower the score. Known date contradictions contribute zero. Different campus locations contribute zero, because unverified geographic proximity is not inferred.

Images are uploaded, served and displayed on cards, details, match pairs and history. The image-comparison component is explicitly unavailable in both API metadata and the interface. An identical image URL or filename never boosts a score. Local example images are original SVG illustrations, labelled as examples, stored at `client/public/demo-items`; there is no scraped-photo dependency.

Every saved match includes component scores, reasons, effective normalized weights, `text_method`, `model`, `scoring_version`, `image_available:false` and `image_similarity:null`. High is ≥80%, Medium ≥60%, otherwise Low. These scores rank candidates; they are not calibrated probabilities of ownership.

Measured test case: “Black leather wallet containing my college ID” versus “Found a black leather wallet with a student identity card inside”, same Wallet category/B Block, found one day after loss, with optional attributes absent: **91.9% final score** using the real cached model. Scores come from the model/evidence; there is no 90% score floor. Unrelated descriptions and contradictory fields score lower.

`services/matchPersistence.js` queries only active lost/found reports, recalculates their pairs after mutations/startup and removes pairs involving inactive or deleted reports. A Returned report stays in MongoDB/history but leaves the active feed and future matching. Operations are serialized within this single Node process and the algorithm recomputes O(lost × found) pairs, appropriate to a modest campus demo. A database failure after a report write can interrupt recomputation; restart rebuilds persisted matches.

## Status migration and history

Both item types accept only `active` and `returned`. Startup and seeding run an idempotent migration from the legacy inactive statuses to `returned`. The standalone command is:

```powershell
npm run migrate
```

Legacy closed records stay inactive by mapping to Returned. Documents are updated in place: IDs, owners, descriptions, dates and uploaded images remain intact. No user collection is dropped or cleared. Seeding backfills images only on demo-key records with no image and updates only exact original demo descriptions, preserving uploaded photos and user edits.

Search and per-type list APIs default to Active. Pass `status=returned` for history or `status=all` for both. The home page explicitly requests only active reports in separate lost/found sections. My Reports queries the signed-in user's active and returned records in separately paginated sections. The dashboard aggregates `active_lost`, `active_found`, `returned` and `total_reports` in MongoDB.

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Create account / obtain JWT |
| GET | `/api/auth/me` | Current account (Bearer token) |
| POST | `/api/lost`, `/api/found` | Create report (authenticated) |
| GET | `/api/lost`, `/api/found` | Paginated filtered reports |
| GET | `/api/lost/:id`, `/api/found/:id` | One report |
| PUT | `/api/lost/:id`, `/api/found/:id` | Edit fields or status (owner/admin) |
| DELETE | `/api/lost/:id`, `/api/found/:id` | Delete report (owner/admin) |
| GET | `/api/search` | Combined reports; `type`, `q`, `category`, `campus_location`, `date`, `status`, `reported_by`, `page`, `limit`, optional `near`/`radius` |
| GET | `/api/matches/:lostItemId` | Top 5 found candidates |
| GET | `/api/matches/found/:id` | Top 5 lost candidates |
| GET | `/api/matches` | Top 50 pairs campus-wide |
| GET | `/api/dashboard` | Aggregation statistics |
| GET | `/api/locations`, `/api/categories` | Form options |
| POST | `/api/uploads` | Authenticated multipart `image`, returns `image_url` |
| GET | `/api/health` | Database connection health (200/503) |

Query example: `/api/search?type=lost&category=Wallet&campus_location=B%20Block&status=active&q=black&date=2026-10-25&page=1&limit=12`. Event date means `date_lost` or `date_found`, not submission date. Lists return `{items,total,page,pages}`. HTTP errors return `{message}` with 400, 401, 403, 404, 409, 422 or 503 as appropriate. Report JSON never exposes email/password/phone. Public registration cannot create an admin.

## Suggested academic demo and screenshots

1. Open the home notice board after seeding. A captured home preview is included at `docs/screenshots/home.png`.
2. Sign in with the demo account; open a wallet report and inspect its saved match score breakdown. A real browser-created report and its five match results are captured at `docs/screenshots/report-verification.png`.
3. Create a bottle report without brand/model, adding capacity/material through the named detail fields, then inspect the actual document in Compass.
4. Edit a report, search by category/location, then mark it returned. Show that it leaves active matching.
5. Open the aggregation dashboard and show the pipeline source and indexes alongside it.

The two PNGs above are captured UI output. The local demonstration database also includes one additional `Campus verification wallet` report created through the browser during verification. Fresh seed data contains the 17 lost and 9 found reports described above.

## Prototype boundaries and future improvements

This is a working local academic system. Anyone can create a campus account; there is no college-email verification or password reset. Report metadata is visible to visitors; contact details are intentionally not published. Coordinate handovers through the campus office. Images stay on local disk, including old images after replacement/deletion; a future cleanup job can remove unused files. The app detects image signatures but does not perform full image decoding/normalization. Keep the prototype on a trusted local environment.

The dependency audit at implementation time reports two moderate advisories through React Router 6 (redirect handling and SSR hydration). This application uses fixed internal route prefixes and does not use SSR hydration. A production upgrade should move to a supported Node.js 20+ runtime and patched React Router 7; do not apply `npm audit fix --force` blindly, since its suggested downgrade breaks the routing API.

The Node.js 18-compatible Transformers.js 3 dependency also brings an unused sharp image codec with high-severity dependency advisories. This application uses text embeddings only and does not pass uploaded images to that codec. Before deploying beyond the local academic environment, upgrade to Node.js 20.9+ and the patched Transformers.js 4/sharp versions and rerun the tests.

Future work: verified campus coordinates, email verification/reset, private claim conversations, office handover workflow, audited admin tools, measured matching evaluation, scalable candidate selection/background jobs, image cleanup and object storage. True image comparison remains unavailable and is explicitly labelled.

Troubleshooting: if startup fails, check `server/.env`, MongoDB service status, Atlas access settings and the configured URI. Port conflicts can be resolved by stopping the conflicting process or updating `PORT` plus Vite's proxy. If Vite chooses a different port, update `CLIENT_ORIGIN` accordingly. The backend deliberately does not run with a fake database fallback.
