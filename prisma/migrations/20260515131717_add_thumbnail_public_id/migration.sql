-- AlterTable
ALTER TABLE "Story" ADD COLUMN "thumbnailPublicId" TEXT;

-- CreateIndex
CREATE INDEX "Story_thumbnailPublicId_idx" ON "Story"("thumbnailPublicId");
