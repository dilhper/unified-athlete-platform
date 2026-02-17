-- v1.4 Migration: Allow email OR phone registration
-- Makes email nullable to support phone-only registration

ALTER TABLE users DROP CONSTRAINT users_email_key;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add check constraint to ensure at least one of email or phone is provided
ALTER TABLE users ADD CONSTRAINT check_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Create unique index for email (allowing nulls)
CREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
