-- AlterTable
ALTER TABLE "ProductImage" DROP COLUMN "publicId",
DROP COLUMN "url",
ADD COLUMN     "mediaId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "widths" INTEGER[],
    "blurDataUrl" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_purpose_createdAt_idx" ON "MediaAsset"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "ProductImage_mediaId_idx" ON "ProductImage"("mediaId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Hand-written additions ───
-- RLS on every new table (see 20261018000000_init).
ALTER TABLE "MediaAsset" ENABLE ROW LEVEL SECURITY;
