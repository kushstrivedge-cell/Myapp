-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
