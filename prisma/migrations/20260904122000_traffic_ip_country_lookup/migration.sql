ALTER TABLE "TrafficSession"
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "countrySource" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN "countryLookupAt" TIMESTAMP(3);
