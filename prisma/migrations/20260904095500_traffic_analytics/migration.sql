-- CreateTable
CREATE TABLE "TrafficMetric" (
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "countryCode" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficMetric_pkey" PRIMARY KEY ("bucketStart","countryCode","deviceType")
);

-- CreateTable
CREATE TABLE "TrafficSession" (
    "sessionHash" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficSession_pkey" PRIMARY KEY ("sessionHash")
);

-- CreateIndex
CREATE INDEX "TrafficMetric_bucketStart_idx" ON "TrafficMetric"("bucketStart");

-- CreateIndex
CREATE INDEX "TrafficMetric_countryCode_bucketStart_idx" ON "TrafficMetric"("countryCode", "bucketStart");

-- CreateIndex
CREATE INDEX "TrafficMetric_deviceType_bucketStart_idx" ON "TrafficMetric"("deviceType", "bucketStart");

-- CreateIndex
CREATE INDEX "TrafficSession_lastSeenAt_idx" ON "TrafficSession"("lastSeenAt");
