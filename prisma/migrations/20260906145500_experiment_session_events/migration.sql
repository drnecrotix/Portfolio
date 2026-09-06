CREATE TABLE "ExperimentSessionEvent" (
    "experimentId" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentSessionEvent_pkey" PRIMARY KEY ("experimentId", "sessionHash", "event")
);

CREATE INDEX "ExperimentSessionEvent_experimentId_variant_event_idx"
    ON "ExperimentSessionEvent"("experimentId", "variant", "event");

CREATE INDEX "ExperimentSessionEvent_createdAt_idx"
    ON "ExperimentSessionEvent"("createdAt");
