ALTER TABLE "User" ADD COLUMN "cartCouponCode" TEXT;

CREATE TABLE "GuestCart" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestCart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestCartItem" (
    "id" TEXT NOT NULL,
    "guestCartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestCartItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestCart_token_key" ON "GuestCart"("token");
CREATE UNIQUE INDEX "GuestCartItem_guestCartId_variantId_key" ON "GuestCartItem"("guestCartId", "variantId");
CREATE INDEX "GuestCartItem_guestCartId_idx" ON "GuestCartItem"("guestCartId");
ALTER TABLE "User" ADD CONSTRAINT "User_cartCouponCode_fkey" FOREIGN KEY ("cartCouponCode") REFERENCES "Coupon"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuestCart" ADD CONSTRAINT "GuestCart_couponCode_fkey" FOREIGN KEY ("couponCode") REFERENCES "Coupon"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuestCartItem" ADD CONSTRAINT "GuestCartItem_guestCartId_fkey" FOREIGN KEY ("guestCartId") REFERENCES "GuestCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestCartItem" ADD CONSTRAINT "GuestCartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
