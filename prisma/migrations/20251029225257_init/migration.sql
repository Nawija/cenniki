-- CreateTable
CREATE TABLE "ProductOverride" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "customName" TEXT,
    "priceFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOverride_manufacturer_idx" ON "ProductOverride"("manufacturer");

-- CreateIndex
CREATE INDEX "ProductOverride_manufacturer_category_idx" ON "ProductOverride"("manufacturer", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOverride_manufacturer_category_productName_key" ON "ProductOverride"("manufacturer", "category", "productName");
