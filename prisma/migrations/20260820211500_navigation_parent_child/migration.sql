ALTER TABLE "NavigationItem" ADD COLUMN "parentId" TEXT;

CREATE INDEX "NavigationItem_parentId_sortOrder_idx"
ON "NavigationItem"("parentId", "sortOrder");

ALTER TABLE "NavigationItem"
ADD CONSTRAINT "NavigationItem_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "NavigationItem"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve the existing virtual About dropdown as a real parent item.
INSERT INTO "NavigationItem" ("id", "label", "href", "location", "sortOrder", "isVisible", "isExternal", "createdAt", "updatedAt")
SELECT 'nav_about', 'About', '/about', 'primary', 50, true, false, NOW(), NOW()
WHERE EXISTS (
  SELECT 1 FROM "NavigationItem" WHERE "location" = 'about'
)
AND NOT EXISTS (
  SELECT 1 FROM "NavigationItem" WHERE LOWER("label") = 'about' AND "parentId" IS NULL
);

WITH about_parent AS (
  SELECT "id"
  FROM "NavigationItem"
  WHERE LOWER("label") = 'about' AND "parentId" IS NULL
  ORDER BY "createdAt" ASC
  LIMIT 1
)
UPDATE "NavigationItem"
SET "parentId" = (SELECT "id" FROM about_parent),
    "location" = 'primary'
WHERE "location" = 'about'
  AND "id" <> (SELECT "id" FROM about_parent);
