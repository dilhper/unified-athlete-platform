/*
================================================================================
UNIFIED ATHLETE PLATFORM - DATABASE SCHEMA (FROZEN - v1.1)
================================================================================
This schema has been frozen and locked to ensure database stability.
All modifications must be approved and versioned.

IMPORTANT: This schema is now SQL-only and Prisma has been removed.
- All data access uses raw SQL via lib/db.ts
- No ORM migrations are used
- Schema changes require explicit versioning

VERSIONING:
- v1.0: Initial frozen schema (Feb 2026)
  - 15+ tables covering athlete platform domains
  - All constraints, indexes, and relationships defined
  - This is the stable baseline for all future development
- v1.1: Added audit logging (Feb 2026)
  - audit_logs table for compliance and forensics
  - Immutable record of all permission checks and state mutations
  - Supports Phase 4 transaction + audit implementation

MODIFICATION POLICY:
- Schema freezing prevents accidental breaking changes
- All changes must be version-bumped
- Coordinate changes across: schema.sql, seed.sql, and API routes
- Document rationale in commit messages
================================================================================
*/

-- Drop existing tables if they exist (for fresh start)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS medical_referrals CASCADE;
DROP TABLE IF EXISTS physiotherapy_appointments CASCADE;
DROP TABLE IF EXISTS physiotherapy_slots CASCADE;
DROP TABLE IF EXISTS training_plan_pause_requests CASCADE;
DROP TABLE IF EXISTS daily_training_forms CASCADE;
DROP TABLE IF EXISTS training_sessions CASCADE;
DROP TABLE IF EXISTS training_plans CASCADE;
DROP TABLE IF EXISTS sport_registrations CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS certifications CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('athlete', 'coach', 'specialist', 'official')),
  password_hash VARCHAR(255),
  avatar TEXT,
  bio TEXT,
  sport VARCHAR(255),
  specialty VARCHAR(255),
  specialization VARCHAR(255),
  rating DECIMAL(3, 2),
  profile_verified BOOLEAN DEFAULT FALSE,
  profile_pending_verification BOOLEAN DEFAULT FALSE,
  registration_verified BOOLEAN DEFAULT FALSE,
  registration_rejected BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  verified_by VARCHAR(255),
  verified_at TIMESTAMP,
  is_admin BOOLEAN DEFAULT FALSE,
  athlete_type VARCHAR(50) CHECK (athlete_type IN ('student', 'university', 'normal')),
  documents TEXT[],
  location VARCHAR(255),
  years_of_experience INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Auth Tokens table (email verification + password reset)
CREATE TABLE auth_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('email_verification', 'password_reset')),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Achievements table
CREATE TABLE achievements (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  evidence TEXT,
  attachments TEXT[],
  verified_by VARCHAR(255),
  verified_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Certifications table
CREATE TABLE certifications (
  id VARCHAR(255) PRIMARY KEY,
  coach_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  issuing_organization VARCHAR(255) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  credential_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  attachments TEXT[],
  verified_by VARCHAR(255),
  verified_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Training Plans table
CREATE TABLE training_plans (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coach_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  mode VARCHAR(50) DEFAULT 'both' CHECK (mode IN ('physical', 'online', 'both')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Training Plan Athletes (join table)
CREATE TABLE training_plan_athletes (
  plan_id VARCHAR(255) NOT NULL,
  athlete_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (plan_id, athlete_id),
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Training Sessions table
CREATE TABLE training_sessions (
  id VARCHAR(255) PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  mode VARCHAR(50) CHECK (mode IN ('physical', 'online')),
  notes TEXT,
  duration INT,
  description TEXT,
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
);

-- Daily Training Forms table
CREATE TABLE daily_training_forms (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  duration INT NOT NULL,
  intensity VARCHAR(50) CHECK (intensity IN ('low', 'medium', 'high')),
  exercises TEXT,
  mood VARCHAR(50) CHECK (mood IN ('poor', 'fair', 'good', 'excellent')),
  notes TEXT,
  evidence TEXT,
  attachments TEXT[],
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
);

-- Sport Registrations table
CREATE TABLE sport_registrations (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  sport VARCHAR(255) NOT NULL,
  priority INT CHECK (priority >= 1 AND priority <= 3),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Physiotherapy Slots table
CREATE TABLE physiotherapy_slots (
  id VARCHAR(255) PRIMARY KEY,
  specialist_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INT NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Physiotherapy Appointments table
CREATE TABLE physiotherapy_appointments (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  slot_id VARCHAR(255) NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES physiotherapy_slots(id) ON DELETE CASCADE
);

-- Training Plan Pause Requests table
CREATE TABLE training_plan_pause_requests (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(255) NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  reason VARCHAR(50) CHECK (reason IN ('medical', 'event', 'exam', 'other')),
  description TEXT,
  needs_medical_referral BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Medical Referrals table
CREATE TABLE medical_referrals (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  specialist_id VARCHAR(255) NOT NULL,
  issue VARCHAR(255) NOT NULL,
  urgency VARCHAR(50) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Consultations table
CREATE TABLE consultations (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  specialist_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  title VARCHAR(255),
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  sender_id VARCHAR(255) NOT NULL,
  receiver_id VARCHAR(255),
  community_id VARCHAR(255),
  content TEXT NOT NULL,
  attachments TEXT[],
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Communities table
CREATE TABLE communities (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id VARCHAR(255) NOT NULL,
  member_ids TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit Logs table (Phase 4: Compliance + Forensics)
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor_id VARCHAR(255),                        -- Who performed the action (NULL for unauthenticated)
  actor_role VARCHAR(50),                       -- Their role (athlete, coach, specialist, official)
  action VARCHAR(100) NOT NULL,                 -- What action (APPROVE_REGISTRATION, VERIFY_ACHIEVEMENT, etc)
  resource_type VARCHAR(100),                   -- Resource category (users, opportunities, achievements, etc)
  resource_id VARCHAR(255),                     -- Specific resource ID
  result VARCHAR(20) NOT NULL,                  -- success / denied / error
  denial_reason TEXT,                           -- Why request was denied (if applicable)
  status_before JSONB,                          -- Previous state (for auditing changes)
  status_after JSONB,                           -- New state (for auditing changes)
  ip_address VARCHAR(50),                       -- Source IP address
  user_agent TEXT,                              -- Client info (browser, mobile, etc)
  error_message TEXT,                           -- Error details (if result = error)
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for audit_logs (critical for forensics)
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_result ON audit_logs(result);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE UNIQUE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_type ON auth_tokens(token_type);
CREATE INDEX idx_achievements_athlete ON achievements(athlete_id);
CREATE INDEX idx_achievements_status ON achievements(status);
CREATE INDEX idx_training_plans_coach ON training_plans(coach_id);
CREATE INDEX idx_training_plans_status ON training_plans(status);
CREATE INDEX idx_daily_forms_athlete ON daily_training_forms(athlete_id);
CREATE INDEX idx_daily_forms_date ON daily_training_forms(date);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_consultations_athlete ON consultations(athlete_id);
