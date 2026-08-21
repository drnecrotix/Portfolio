-- AlterTable
ALTER TABLE "BlogComment" ADD COLUMN "parentId" TEXT;

-- CreateTable
CREATE TABLE "BlogPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogComment_parentId_createdAt_idx" ON "BlogComment"("parentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostLike_postId_visitorId_key" ON "BlogPostLike"("postId", "visitorId");

-- CreateIndex
CREATE INDEX "BlogPostLike_postId_createdAt_idx" ON "BlogPostLike"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
