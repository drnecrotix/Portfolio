-- CreateEnum
CREATE TYPE "StoreProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "priceCents" INTEGER NOT NULL,
    "compareAtPriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "coverImageUrl" TEXT,
    "lemonSqueezyVariantId" TEXT,
    "status" "StoreProductStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "downloadLimit" INTEGER NOT NULL DEFAULT 5,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreProductFile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreProductFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreOrder" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'lemonsqueezy',
    "providerOrderId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "customerName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreDownloadGrant" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreDownloadGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreCheckoutSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreProduct_slug_key" ON "StoreProduct"("slug");
CREATE INDEX "StoreProduct_status_publishedAt_idx" ON "StoreProduct"("status", "publishedAt");
CREATE INDEX "StoreProduct_category_status_idx" ON "StoreProduct"("category", "status");
CREATE INDEX "StoreProduct_featured_status_idx" ON "StoreProduct"("featured", "status");
CREATE UNIQUE INDEX "StoreProductFile_storageKey_key" ON "StoreProductFile"("storageKey");
CREATE INDEX "StoreProductFile_productId_sortOrder_idx" ON "StoreProductFile"("productId", "sortOrder");
CREATE UNIQUE INDEX "StoreOrder_providerOrderId_key" ON "StoreOrder"("providerOrderId");
CREATE INDEX "StoreOrder_status_createdAt_idx" ON "StoreOrder"("status", "createdAt");
CREATE INDEX "StoreOrder_email_createdAt_idx" ON "StoreOrder"("email", "createdAt");
CREATE INDEX "StoreOrderItem_orderId_idx" ON "StoreOrderItem"("orderId");
CREATE INDEX "StoreOrderItem_productId_idx" ON "StoreOrderItem"("productId");
CREATE UNIQUE INDEX "StoreDownloadGrant_token_key" ON "StoreDownloadGrant"("token");
CREATE UNIQUE INDEX "StoreDownloadGrant_orderId_productId_key" ON "StoreDownloadGrant"("orderId", "productId");
CREATE INDEX "StoreDownloadGrant_productId_createdAt_idx" ON "StoreDownloadGrant"("productId", "createdAt");
CREATE UNIQUE INDEX "StoreCheckoutSession_token_key" ON "StoreCheckoutSession"("token");
CREATE INDEX "StoreCheckoutSession_productId_createdAt_idx" ON "StoreCheckoutSession"("productId", "createdAt");
CREATE INDEX "StoreCheckoutSession_expiresAt_idx" ON "StoreCheckoutSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "StoreProductFile" ADD CONSTRAINT "StoreProductFile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreOrderItem" ADD CONSTRAINT "StoreOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoreDownloadGrant" ADD CONSTRAINT "StoreDownloadGrant_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreDownloadGrant" ADD CONSTRAINT "StoreDownloadGrant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreCheckoutSession" ADD CONSTRAINT "StoreCheckoutSession_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add Store only when the site already has customized navigation. Fresh installs keep the empty state so the normal default-navigation bootstrap can run.
INSERT INTO "NavigationItem" ("id", "label", "href", "location", "sortOrder", "isVisible", "isExternal", "isDropdown", "dropdownStyle", "parentId", "createdAt", "updatedAt")
SELECT 'store', 'Store', '/store', 'primary', 25, true, false, false, 'auto', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "NavigationItem")
  AND NOT EXISTS (SELECT 1 FROM "NavigationItem" WHERE "href" = '/store');
