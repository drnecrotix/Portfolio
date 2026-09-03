CREATE TABLE "GalleryWorkStats" (
    "slug" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryWorkStats_pkey" PRIMARY KEY ("slug")
);

CREATE TABLE "GalleryWorkLike" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryWorkLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GalleryWorkLike_slug_visitorId_key" ON "GalleryWorkLike"("slug", "visitorId");
CREATE INDEX "GalleryWorkLike_slug_createdAt_idx" ON "GalleryWorkLike"("slug", "createdAt");

ALTER TABLE "GalleryWorkLike"
ADD CONSTRAINT "GalleryWorkLike_slug_fkey"
FOREIGN KEY ("slug") REFERENCES "GalleryWorkStats"("slug")
ON DELETE CASCADE ON UPDATE CASCADE;
