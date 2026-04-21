-- Add column for refresh token revocation/rotation support
ALTER TABLE "User"
ADD COLUMN "refreshTokenHash" TEXT;
