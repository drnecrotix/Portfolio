CREATE TABLE "ExperimentMetric" (
    "experimentId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentMetric_pkey" PRIMARY KEY ("experimentId", "variant", "event")
);

CREATE INDEX "ExperimentMetric_experimentId_updatedAt_idx" ON "ExperimentMetric"("experimentId", "updatedAt");
