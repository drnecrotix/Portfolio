CREATE TYPE "ServiceRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'QUOTE_SENT', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'COMPLETED', 'REJECTED');

CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "company" TEXT,
    "cms" TEXT,
    "accessStatus" TEXT,
    "budgetCents" INTEGER,
    "selectedIssues" JSONB NOT NULL,
    "auditSnapshot" JSONB,
    "scanScore" INTEGER,
    "estimateMinCents" INTEGER NOT NULL,
    "estimateMaxCents" INTEGER NOT NULL,
    "finalQuoteCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "customerMessage" TEXT,
    "internalNotes" TEXT,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceRequest_reference_key" ON "ServiceRequest"("reference");
CREATE INDEX "ServiceRequest_status_createdAt_idx" ON "ServiceRequest"("status", "createdAt");
CREATE INDEX "ServiceRequest_customerEmail_createdAt_idx" ON "ServiceRequest"("customerEmail", "createdAt");
CREATE INDEX "ServiceRequest_source_createdAt_idx" ON "ServiceRequest"("source", "createdAt");
