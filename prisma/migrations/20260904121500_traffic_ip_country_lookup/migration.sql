-- Store raw client IP only inside short-lived TrafficSession rows so country
-- attribution can fall back to IP lookup when the hosting proxy does not
-- provide a country header. These rows are purged after about 24 hours.
ALTER TABLE "TrafficSession"
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "countryLookupAt" TIMESTAMP(3);
