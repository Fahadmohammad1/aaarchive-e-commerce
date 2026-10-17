-- Phase 2: category and collection photos come from the media library
-- (docs/architecture.md §4.7a). Additive only; the old free-text "image"
-- columns stay until the owner approves dropping them. No new tables, so no
-- RLS change is needed.
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "imageId" TEXT;

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "imageId" TEXT,
ADD COLUMN     "showOnHome" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Category_imageId_idx" ON "Category"("imageId");

-- CreateIndex
CREATE INDEX "Collection_imageId_idx" ON "Collection"("imageId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

