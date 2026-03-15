-- CreateTable
CREATE TABLE "public"."UserChurnBaseline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avgCheckInsPerWeek" DOUBLE PRECISION NOT NULL,
    "periodWeeks" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserChurnBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserChurnBaseline_userId_key" ON "public"."UserChurnBaseline"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserChurnBaseline" ADD CONSTRAINT "UserChurnBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
