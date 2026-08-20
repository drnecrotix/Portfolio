ALTER TABLE "NavigationItem"
ADD COLUMN "dropdownStyle" TEXT NOT NULL DEFAULT 'auto';

UPDATE "NavigationItem"
SET "dropdownStyle" = 'auto'
WHERE "isDropdown" = true;
