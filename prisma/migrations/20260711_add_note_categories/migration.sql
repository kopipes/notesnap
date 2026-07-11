BEGIN;

-- CreateTable NoteCategory (join table for many-to-many Note <-> Category)
CREATE TABLE "NoteCategory" (
    "noteId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    PRIMARY KEY ("noteId", "categoryId"),
    CONSTRAINT "NoteCategory_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for reverse lookups by categoryId (category filter + cascade deletes)
CREATE INDEX "NoteCategory_categoryId_idx" ON "NoteCategory" ("categoryId");

-- Migrate existing single-category data into join table
INSERT INTO "NoteCategory" ("noteId", "categoryId")
SELECT "id", "categoryId" FROM "Note"
WHERE "categoryId" IS NOT NULL;

-- Drop old column (SQLite requires recreating the table)
-- Step 1: create new Note table without categoryId
CREATE TABLE "Note_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Catatan Baru',
    "content" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "userId" TEXT NOT NULL DEFAULT '',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 2: copy data
INSERT INTO "Note_new" ("id","title","content","summary","userId","pinned","archived","deletedAt","createdAt","updatedAt")
SELECT "id","title","content","summary","userId","pinned","archived","deletedAt","createdAt","updatedAt"
FROM "Note";

-- Step 3: drop old, rename new
DROP TABLE "Note";
ALTER TABLE "Note_new" RENAME TO "Note";

COMMIT;
