CREATE TYPE "StorePaymentProvider" AS ENUM ('LEMON_SQUEEZY', 'CREEM');

ALTER TABLE "StoreProduct"
ADD COLUMN "paymentProvider" "StorePaymentProvider" NOT NULL DEFAULT 'LEMON_SQUEEZY',
ADD COLUMN "creemProductId" TEXT;

CREATE INDEX "StoreProduct_paymentProvider_status_idx"
ON "StoreProduct"("paymentProvider", "status");
