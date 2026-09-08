CREATE TABLE "FootprintVerification" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "emailCipher" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "sessionHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FootprintVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FootprintVerification_emailHash_key" ON "FootprintVerification"("emailHash");
CREATE UNIQUE INDEX "FootprintVerification_sessionHash_key" ON "FootprintVerification"("sessionHash");
CREATE INDEX "FootprintVerification_expiresAt_idx" ON "FootprintVerification"("expiresAt");
