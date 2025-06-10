/*
  Warnings:

  - You are about to drop the column `type` on the `Sighting` table. All the data in the column will be lost.
  - Added the required column `city` to the `Sighting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `count` to the `Sighting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noise` to the `Sighting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shape` to the `Sighting` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sighting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "noise" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Sighting" ("createdAt", "date", "description", "id", "latitude", "longitude") SELECT "createdAt", "date", "description", "id", "latitude", "longitude" FROM "Sighting";
DROP TABLE "Sighting";
ALTER TABLE "new_Sighting" RENAME TO "Sighting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
