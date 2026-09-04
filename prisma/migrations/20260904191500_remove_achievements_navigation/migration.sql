-- Remove the retired Achievements page from existing navigation data.
DELETE FROM "NavigationItem"
WHERE "href" = '/achievements';
