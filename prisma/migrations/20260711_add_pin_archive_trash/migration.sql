-- AlterTable: add pinned, archived, deletedAt to Note
ALTER TABLE "Note" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Note" ADD COLUMN "deletedAt" DATETIME;
