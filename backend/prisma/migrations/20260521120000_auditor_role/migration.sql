-- Enterprise read-only compliance role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AUDITOR';
