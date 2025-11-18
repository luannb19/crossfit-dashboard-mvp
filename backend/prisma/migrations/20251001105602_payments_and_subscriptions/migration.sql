-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripeIntentId" TEXT,
    "stripeCustomerId" TEXT,
    "priceId" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "status" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "customerEmail" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "stripeSubId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "priceId" TEXT,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN DEFAULT false,
    "customerEmail" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "public"."Payment"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeIntentId_key" ON "public"."Payment"("stripeIntentId");

-- CreateIndex
CREATE INDEX "Payment_customerEmail_idx" ON "public"."Payment"("customerEmail");

-- CreateIndex
CREATE INDEX "Payment_mode_status_idx" ON "public"."Payment"("mode", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubId_key" ON "public"."Subscription"("stripeSubId");

-- CreateIndex
CREATE INDEX "Subscription_customerEmail_idx" ON "public"."Subscription"("customerEmail");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status");
