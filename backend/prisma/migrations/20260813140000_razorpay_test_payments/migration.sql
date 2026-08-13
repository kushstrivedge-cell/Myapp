CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'RAZORPAY', "providerOrderId" TEXT NOT NULL,
  "providerPaymentId" TEXT, "status" TEXT NOT NULL DEFAULT 'CREATED',
  "failureCode" TEXT, "failureMessage" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentRefund" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "providerRefundId" TEXT, "amount" DECIMAL(12,2) NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentWebhookEvent" ("id" TEXT NOT NULL, "event" TEXT NOT NULL, "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentAttempt_providerOrderId_key" ON "PaymentAttempt"("providerOrderId");
CREATE UNIQUE INDEX "PaymentAttempt_providerPaymentId_key" ON "PaymentAttempt"("providerPaymentId");
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");
CREATE UNIQUE INDEX "PaymentRefund_idempotencyKey_key" ON "PaymentRefund"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentRefund_providerRefundId_key" ON "PaymentRefund"("providerRefundId");
CREATE INDEX "PaymentRefund_orderId_createdAt_idx" ON "PaymentRefund"("orderId", "createdAt");
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
