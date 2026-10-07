# Phase 1 — MVP Fare System — Changes Summary

This update implements the "Phase 1 – MVP Fare System" spec on top of the
existing On-Demand Taxi Booking platform, without changing any other
existing functionality.

## New files
- `models/fareConfigModel.js` — single active fare configuration document
  (trip thresholds, base fare per trip type, per-mile tiers, fees).
- `utils/fareEngine.js` — backend trip classification + fare calculation
  engine. Formula: `Total Fare = Base Fare + (Per-Mile Charge x Distance) + Fees`.
  Short trips skip the distance charge, exactly as spec'd.
- `controllers/admin/fareController.js` + `routes/admin/fareRoutes.js` —
  Admin Panel → **Fare Settings**: edit thresholds, base fares, per-mile
  tiers and fees; changes apply instantly, no app update needed.
- `controllers/admin/Reports.js` (was empty) + `views/fareReports.ejs` —
  Admin Panel → **Fare Reports**: trip-type-wise booking counts, revenue
  split, platform fee earnings, driver payout summary (daily/weekly/monthly).
- `views/fareSettings.ejs` — Fare Settings form + live formula preview.

## Modified files
- `app.js` — mounts the new `/admin/` fare routes.
- `views/_layouts/sidenavbar.ejs` — adds "Fare Settings" and "Fare Reports"
  links to the admin sidebar.
- `models/rideReqModel.js` — adds `tripType` and fixes a bug where
  `baseFare` / `distanceCharge` / `platformFee` / `surgeCharge` /
  `estimatedTotal` were being silently dropped (they were never declared
  in the schema, so Mongoose's strict mode discarded them on save).
- `models/rideModel.js` — adds `tripType` (Short / Medium / Long).
- `controllers/user/rideController.js`:
  - `getVehicleTypes` — vehicle list now carries `tripType` and
    `fareBreakup` (base fare, distance charge, platform fee, total),
    computed by the shared fare engine instead of the old ad-hoc
    baseFare + distanceRate calculation.
  - `getFareDetails` — same engine, same response shape as before, plus
    `tripType`.
  - `bookRide` — **fare is now always recomputed on the backend** from
    pickup/drop coordinates rather than trusted from the client, per the
    spec's "Non-Functional Requirements" (backend-driven, deterministic,
    same across User/Driver/Admin, tamper-proof).

## Not included in this pass (separate large phases — flagged in the spec itself)
- **Phase 2**: surge pricing, driver bonuses (daily/distance/peak-hour/streak),
  rider incentives (referral, loyalty, streaks), wallet credits.
- **Phase 3**: multi-city/country fare configuration, dynamic pricing engine,
  advanced analytics dashboards.

Both are large, separately-scoped efforts in the source document and are
best implemented (and tested) as their own follow-up passes.
