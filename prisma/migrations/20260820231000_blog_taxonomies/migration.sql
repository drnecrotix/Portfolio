CREATE TABLE "BlogPostType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "editorMode" "PostType" NOT NULL DEFAULT 'ARTICLE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogPostType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogPostType_slug_key" ON "BlogPostType"("slug");
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

ALTER TABLE "Post" ADD COLUMN "postTypeId" TEXT;
ALTER TABLE "Post" ADD COLUMN "categoryId" TEXT;

INSERT INTO "BlogPostType" ("id", "name", "slug", "editorMode", "sortOrder") VALUES
('builtin-article', 'Article', 'article', 'ARTICLE', 10),
('builtin-poetry', 'Poetry', 'poetry', 'POETRY', 20),
('builtin-thought', 'Thought', 'thought', 'THOUGHT', 30),
('builtin-note', 'Note', 'note', 'NOTE', 40),
('builtin-project-log', 'Project Log', 'project-log', 'PROJECT_LOG', 50)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Post" SET "postTypeId" = CASE "type"
    WHEN 'ARTICLE' THEN 'builtin-article'
    WHEN 'POETRY' THEN 'builtin-poetry'
    WHEN 'THOUGHT' THEN 'builtin-thought'
    WHEN 'NOTE' THEN 'builtin-note'
    WHEN 'PROJECT_LOG' THEN 'builtin-project-log'
    ELSE 'builtin-article'
END;

INSERT INTO "BlogCategory" ("id", "name", "slug", "sortOrder")
SELECT
    'legacy-' || md5("category"),
    "category",
    trim(both '-' from regexp_replace(lower("category"), '[^a-z0-9]+', '-', 'g')) || '-' || substr(md5("category"), 1, 6),
    row_number() OVER (ORDER BY "category") * 10
FROM (SELECT DISTINCT "category" FROM "Post" WHERE "category" IS NOT NULL AND btrim("category") <> '') existing
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Post" p
SET "categoryId" = c."id"
FROM "BlogCategory" c
WHERE p."category" = c."name";

CREATE INDEX "Post_postTypeId_idx" ON "Post"("postTypeId");
CREATE INDEX "Post_categoryId_idx" ON "Post"("categoryId");

ALTER TABLE "Post" ADD CONSTRAINT "Post_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "BlogPostType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
