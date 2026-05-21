-- CreateEnum
CREATE TYPE "CommunityPostCategory" AS ENUM ('BARANGAY', 'VOLUNTEER', 'DONATION', 'ADVISORY');

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "barangay_id" TEXT,
    "author_user_id" TEXT,
    "category" "CommunityPostCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen_preparedness" (
    "user_id" TEXT NOT NULL,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "badges" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citizen_preparedness_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "community_posts_barangay_id_created_at_idx" ON "community_posts"("barangay_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "community_posts_category_created_at_idx" ON "community_posts"("category", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_preparedness" ADD CONSTRAINT "citizen_preparedness_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
