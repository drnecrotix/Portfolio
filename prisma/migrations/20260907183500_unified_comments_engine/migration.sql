-- CreateEnum
CREATE TYPE "CommentSource" AS ENUM ('BLOG', 'GALLERY', 'PRODUCT');

-- Extend the existing comment table so Blog, Gallery and Store products share one engine.
ALTER TABLE "BlogComment"
    ADD COLUMN "sourceType" "CommentSource" NOT NULL DEFAULT 'BLOG',
    ADD COLUMN "sourceKey" TEXT,
    ADD COLUMN "sourceTitle" TEXT,
    ADD COLUMN "sourcePath" TEXT,
    ADD COLUMN "spamAt" TIMESTAMP(3);

-- Preserve all existing Blog comments and attach canonical source metadata.
UPDATE "BlogComment" AS c
SET
    "sourceKey" = p."slug",
    "sourceTitle" = p."title",
    "sourcePath" = '/blog/' || p."slug"
FROM "Post" AS p
WHERE c."postId" = p."id";

ALTER TABLE "BlogComment"
    ALTER COLUMN "sourceKey" SET NOT NULL,
    ALTER COLUMN "sourceTitle" SET NOT NULL,
    ALTER COLUMN "sourcePath" SET NOT NULL,
    ALTER COLUMN "postId" DROP NOT NULL;

-- Keep replies when a parent is hard-deleted. Public moderation uses statuses first.
ALTER TABLE "BlogComment" DROP CONSTRAINT IF EXISTS "BlogComment_parentId_fkey";
ALTER TABLE "BlogComment"
    ADD CONSTRAINT "BlogComment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "BlogComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "BlogComment_sourceType_sourceKey_status_createdAt_idx"
    ON "BlogComment"("sourceType", "sourceKey", "status", "createdAt");
CREATE INDEX "BlogComment_status_spamAt_idx"
    ON "BlogComment"("status", "spamAt");
