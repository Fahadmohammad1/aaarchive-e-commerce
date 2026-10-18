-- Custom per-product size tables (PRD §6.2) live in "SizeChart" with
-- isTemplate = false, so the templates list only shows reusable charts.
-- Existing rows are templates. Additive; approved by the owner on 2026-10-19.
-- AlterTable
ALTER TABLE "SizeChart" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "SizeChart_isTemplate_name_idx" ON "SizeChart"("isTemplate", "name");
