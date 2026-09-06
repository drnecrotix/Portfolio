CREATE TABLE "TrafficPageEvent" (
    "id" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "city" TEXT,
    "ipAddress" TEXT,
    "deviceType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficPageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrafficPageEvent_occurredAt_idx" ON "TrafficPageEvent"("occurredAt");
CREATE INDEX "TrafficPageEvent_sessionHash_occurredAt_idx" ON "TrafficPageEvent"("sessionHash", "occurredAt");
CREATE INDEX "TrafficPageEvent_countryCode_occurredAt_idx" ON "TrafficPageEvent"("countryCode", "occurredAt");
CREATE INDEX "TrafficPageEvent_deviceType_occurredAt_idx" ON "TrafficPageEvent"("deviceType", "occurredAt");
CREATE INDEX "TrafficPageEvent_path_occurredAt_idx" ON "TrafficPageEvent"("path", "occurredAt");
