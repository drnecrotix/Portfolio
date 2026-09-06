ALTER TABLE "TrafficSession"
ADD COLUMN "currentPath" TEXT,
ADD COLUMN "currentCity" TEXT;

CREATE INDEX "TrafficSession_currentPath_lastSeenAt_idx" ON "TrafficSession"("currentPath", "lastSeenAt");
