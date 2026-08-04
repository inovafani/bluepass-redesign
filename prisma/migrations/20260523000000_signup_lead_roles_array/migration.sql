ALTER TYPE "SignupRole" RENAME TO "SignupRole_old";

CREATE TYPE "SignupRole" AS ENUM ('OPERATOR', 'CREATOR');

ALTER TABLE "SignupLead"
ADD COLUMN "roles" "SignupRole"[] NOT NULL DEFAULT ARRAY[]::"SignupRole"[];

UPDATE "SignupLead"
SET "roles" = ARRAY["role"::text::"SignupRole"]::"SignupRole"[]
WHERE "role"::text IN ('OPERATOR', 'CREATOR');

DROP INDEX "SignupLead_role_createdAt_idx";

ALTER TABLE "SignupLead"
DROP COLUMN "role";

DROP TYPE "SignupRole_old";

CREATE INDEX "SignupLead_createdAt_idx" ON "SignupLead"("createdAt");
