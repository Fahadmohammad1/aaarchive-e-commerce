-- Social posts use the media library like every other image (PRD §6.7):
-- `image` (a URL string, never used — the table was empty) becomes a
-- MediaAsset reference plus alt text. Approved by the user 2026-10-19.
-- NOT NULL without defaults: if rows ever existed this fails instead of
-- losing data.

-- AlterTable
ALTER TABLE "SocialPost" DROP COLUMN "image",
ADD COLUMN     "alt" TEXT NOT NULL,
ADD COLUMN     "mediaId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SocialPost_mediaId_idx" ON "SocialPost"("mediaId");

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
