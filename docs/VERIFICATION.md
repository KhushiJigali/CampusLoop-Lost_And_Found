# Verification results

Verified on Windows with Node.js 18.20.8 and the installed MongoDB 8.2 server on 30 October 2026.

- `npm install`: completed; package-lock.json saved.
- `npm test`: 5 matching tests passed.
- `npm run test:integration`: passed against a separate real mongod process. Checked HTTP create/read first, then auth/ownership, invalid dates/locations, text search, pagination response, match persistence, recovery/reopening/deletion, aggregation, indexes and idempotent seeding.
- `npm run build`: passed with Vite 6.
- `npm run seed`: persisted 17 locations, 17 lost reports, 9 found reports and 128 active match pairs in the local `campus_lost_found` database.
- `npm run verify:db`: confirmed the actual database name, collection counts, text and compound indexes, wallet query results and per-location aggregation results.
- Startup: logged `MongoDB connected successfully` and `Server running on port 5000`.
- Browser: verified live home data, demo sign-in, report form, a complete report submission, stored details with owner controls and five automatic match suggestions, plus the live aggregation dashboard. One extra verification report remains in the local database. Browser date automation required native controls; new forms now default to today's date, which can be changed.

The initial sandbox blocked MongoDB process startup and local connections; verification succeeded with the required execution permissions. Tests can run normally outside that sandbox.

Dependency audit: two moderate advisories through React Router 6. See the README's prototype boundaries for applicability and the Node.js 20+/React Router 7 upgrade path. No production deployment or email verification is claimed. Proximity search is schema-ready and deliberately returns 422 until verified campus coordinates are configured. Phone/email details are not exposed on report pages.

Captured UI evidence: [home](screenshots/home.png) and [browser report + matches](screenshots/report-verification.png).
