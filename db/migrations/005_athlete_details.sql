-- Migration 005: Add athlete profile details for coach review
-- Adds fields needed for coaches to make informed decisions about athlete registrations

-- Add new fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_club VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_ranking INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS training_place VARCHAR(255);

-- Update existing test athlete with sample data (optional, for testing)
UPDATE users 
SET 
  school_club = 'St. Joseph College',
  national_ranking = 5,
  date_of_birth = '2005-03-15',
  district = 'Colombo',
  training_place = 'National Stadium'
WHERE name = 'Dilhara' AND role = 'athlete';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_district ON users(district);
CREATE INDEX IF NOT EXISTS idx_users_national_ranking ON users(national_ranking);
