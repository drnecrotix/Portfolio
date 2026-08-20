ALTER TABLE "NavigationItem" ADD COLUMN "isDropdown" BOOLEAN NOT NULL DEFAULT false;

UPDATE "NavigationItem" parent
SET "isDropdown" = true
WHERE EXISTS (
  SELECT 1 FROM "NavigationItem" child WHERE child."parentId" = parent."id"
);
