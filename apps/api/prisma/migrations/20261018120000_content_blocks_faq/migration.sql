-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBlock" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "FaqItem_isActive_sortOrder_idx" ON "FaqItem"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ContentBlock_updatedById_idx" ON "ContentBlock"("updatedById");

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─── Hand-written additions ───
-- RLS on every new table (see 20261018000000_init).
ALTER TABLE "FaqItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentBlock" ENABLE ROW LEVEL SECURITY;
