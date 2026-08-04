-- Removes the pre-publish admin review gate for OperatorListing: operators publish directly
-- (DRAFT -> LIVE), and admins can only take an already-live listing down and bring it back
-- (LIVE <-> ARCHIVED). Preserves existing row data rather than dropping/recreating the table.

BEGIN;

-- Rename the old enum type out of the way so we can recreate it with fewer values.
ALTER TYPE "OperatorListingStatus" RENAME TO "OperatorListingStatus_old";
CREATE TYPE "OperatorListingStatus" AS ENUM ('DRAFT', 'LIVE', 'ARCHIVED');

-- New columns for the simplified lifecycle.
ALTER TABLE "OperatorListing" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "OperatorListing" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "OperatorListing" ADD COLUMN "archivedBy" TEXT;
ALTER TABLE "OperatorListing" ADD COLUMN "archivedReason" TEXT;

-- Best-effort backfill: anything already LIVE gets a publishedAt from its old review/submit
-- timestamp (or createdAt as a last resort) so existing rows aren't left with a null publishedAt.
UPDATE "OperatorListing"
SET "publishedAt" = COALESCE("reviewedAt", "submittedAt", "createdAt")
WHERE "status" = 'LIVE';

-- PENDING_REVIEW/REJECTED never went live under the old flow - they become drafts again under
-- the new one, since there's no more pre-publish review state to hold them in.
UPDATE "OperatorListing"
SET "status" = 'DRAFT'
WHERE "status"::text IN ('PENDING_REVIEW', 'REJECTED');

-- Swap the column onto the new, smaller enum type.
ALTER TABLE "OperatorListing" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "OperatorListing" ALTER COLUMN "status" TYPE "OperatorListingStatus" USING ("status"::text::"OperatorListingStatus");
ALTER TABLE "OperatorListing" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Drop the columns that only made sense for the old pre-publish review flow.
ALTER TABLE "OperatorListing" DROP COLUMN "submittedAt";
ALTER TABLE "OperatorListing" DROP COLUMN "reviewedAt";
ALTER TABLE "OperatorListing" DROP COLUMN "reviewedBy";
ALTER TABLE "OperatorListing" DROP COLUMN "rejectionReason";

DROP TYPE "OperatorListingStatus_old";

COMMIT;
