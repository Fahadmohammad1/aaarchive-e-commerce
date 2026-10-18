-- Drops the free-text "image" columns replaced by imageId/imageAlt in
-- 20261019000000_catalog_images. Approved by the owner on 2026-10-18; both
-- columns were unused (no code reads or writes them).
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "image";

-- AlterTable
ALTER TABLE "Collection" DROP COLUMN "image";

