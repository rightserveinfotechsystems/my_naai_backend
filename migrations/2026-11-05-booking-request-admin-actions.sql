-- 2026-11-05-booking-request-admin-actions.sql
--
-- Admins can answer a booking request on a salon's behalf.
--
-- The API never needed a second table for this: a request is a lead, and
-- answering it writes the queue entry + booking exactly as the salon's own
-- answer does (services/bookingRequestAction.service.js). What it needs is a
-- record of WHO answered, and an index for the admin tab's "today, newest
-- first, every salon" page.
--
-- Every statement is idempotent, and the same DDL is run at boot by
-- src/database/config/ensureShopSchema.js — so a deploy that forgets to run
-- this file still works, and running it twice changes nothing.

BEGIN;

-- ── Who answered ────────────────────────────────────────────────────────────
-- Null on every existing row. That is not missing data: before this release a
-- request could only be answered by its own salon, so a null reads as "SALON".
ALTER TABLE IF EXISTS booking_requests
    ADD COLUMN IF NOT EXISTS acted_by_role       VARCHAR(16);

ALTER TABLE IF EXISTS booking_requests
    ADD COLUMN IF NOT EXISTS acted_by_admin_id   VARCHAR(64);

ALTER TABLE IF EXISTS booking_requests
    ADD COLUMN IF NOT EXISTS acted_at            TIMESTAMPTZ;

ALTER TABLE IF EXISTS booking_requests
    ADD COLUMN IF NOT EXISTS on_behalf_of_salon  BOOLEAN NOT NULL DEFAULT FALSE;

-- The admin's short note (why it was accepted/rejected on the salon's behalf).
-- Shown to the salon, never to the customer.
ALTER TABLE IF EXISTS booking_requests
    ADD COLUMN IF NOT EXISTS admin_note          TEXT;

-- ── The page the admin tab opens on ────────────────────────────────────────
-- Default window is TODAY (IST), ordered created_at DESC, filtered by salon /
-- status / search. The existing (salon_id, status, created_at) index cannot
-- serve "every salon, today", which is the default view.
CREATE INDEX IF NOT EXISTS idx_booking_requests_created_at
    ON booking_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status_created
    ON booking_requests (status, created_at DESC);

COMMIT;
