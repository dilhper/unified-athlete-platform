-- Migration: v1.0 Initial Schema (Baseline)
-- Version: 001
-- Date: 2026-02-08
-- Description: Initial production schema with 15 core tables
-- Status: BASELINE (reference only - schema already exists)
--
-- IMPORTANT: This migration documents the v1.0 baseline schema.
-- It serves as a reference for the initial state and should NOT be applied
-- to databases that already have the v1.0 schema deployed.
--
-- Use Case: New deployments or development environments starting from scratch.
--

-- Users table (core authentication and roles)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('athlete', 'coach', 'specialist', 'official', 'admin')),
  sport VARCHAR(100),
  profile_verified BOOLEAN DEFAULT FALSE,
  profile_pending_verification BOOLEAN DEFAULT FALSE,
  registration_verified BOOLEAN DEFAULT FALSE,
  registration_rejected BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  verified_by VARCHAR(255),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_sport ON users(sport);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Achievements table (athlete accomplishments)
CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_achieved DATE,
  verified BOOLEAN DEFAULT FALSE,
  verified_by VARCHAR(255),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_achievements_athlete ON achievements(athlete_id);
CREATE INDEX idx_achievements_verified ON achievements(verified);

-- Certifications table (coach and specialist credentials)
CREATE TABLE IF NOT EXISTS certifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  issuer VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_certifications_user ON certifications(user_id);
CREATE INDEX idx_certifications_verified ON certifications(verified);

-- Training Plans table (coach-created training programs)
CREATE TABLE IF NOT EXISTS training_plans (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coach_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  mode VARCHAR(50) DEFAULT 'both' CHECK (mode IN ('online', 'in-person', 'both')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_training_plans_coach ON training_plans(coach_id);
CREATE INDEX idx_training_plans_status ON training_plans(status);

-- Training Plan Athletes mapping (many-to-many)
CREATE TABLE IF NOT EXISTS training_plan_athletes (
  plan_id VARCHAR(255) NOT NULL,
  athlete_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (plan_id, athlete_id),
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_training_plan_athletes_athlete ON training_plan_athletes(athlete_id);

-- Training Sessions table (individual workout sessions)
CREATE TABLE IF NOT EXISTS training_sessions (
  id VARCHAR(255) PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  duration_minutes INT,
  session_type VARCHAR(100),
  description TEXT,
  focus_area VARCHAR(100),
  intensity VARCHAR(50) CHECK (intensity IN ('low', 'moderate', 'high')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_training_sessions_plan ON training_sessions(plan_id);
CREATE INDEX idx_training_sessions_date ON training_sessions(date);

-- Daily Training Forms (athlete self-reporting)
CREATE TABLE IF NOT EXISTS daily_training_forms (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  session_date DATE NOT NULL,
  duration_minutes INT,
  intensity VARCHAR(50) CHECK (intensity IN ('low', 'moderate', 'high')),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_daily_training_forms_athlete ON daily_training_forms(athlete_id);
CREATE INDEX idx_daily_training_forms_date ON daily_training_forms(session_date);

-- Opportunities table (scholarships, sponsorships, competitions)
CREATE TABLE IF NOT EXISTS opportunities (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('scholarship', 'sponsorship', 'competition', 'training')),
  description TEXT,
  organization VARCHAR(255),
  amount DECIMAL(12,2),
  sport VARCHAR(100),
  deadline DATE NOT NULL,
  eligibility TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_opportunities_deadline ON opportunities(deadline);

-- Applications table (athlete applications to opportunities)
CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  opportunity_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'shortlisted', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

CREATE INDEX idx_applications_athlete ON applications(athlete_id);
CREATE INDEX idx_applications_opportunity ON applications(opportunity_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Shortlisted table (official athlete selections)
CREATE TABLE IF NOT EXISTS shortlisted (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  opportunity_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'shortlisted' CHECK (status IN ('shortlisted', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

CREATE INDEX idx_shortlisted_status ON shortlisted(status);

-- Communities table (groups for collaboration)
CREATE TABLE IF NOT EXISTS communities (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sport VARCHAR(100),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_communities_sport ON communities(sport);

-- Messages table (direct messaging)
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  sender_id VARCHAR(255) NOT NULL,
  receiver_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Notifications table (system notifications for users)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50),
  link VARCHAR(255),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Consultations table (specialist consultations)
CREATE TABLE IF NOT EXISTS consultations (
  id VARCHAR(255) PRIMARY KEY,
  specialist_id VARCHAR(255) NOT NULL,
  athlete_id VARCHAR(255) NOT NULL,
  consultation_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  date TIMESTAMP,
  duration_minutes INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_consultations_specialist ON consultations(specialist_id);
CREATE INDEX idx_consultations_athlete ON consultations(athlete_id);
CREATE INDEX idx_consultations_status ON consultations(status);

-- Physiotherapy Slots table (specialist availability)
CREATE TABLE IF NOT EXISTS physiotherapy_slots (
  id VARCHAR(255) PRIMARY KEY,
  specialist_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  booked_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_physiotherapy_slots_specialist ON physiotherapy_slots(specialist_id);
CREATE INDEX idx_physiotherapy_slots_available ON physiotherapy_slots(is_available);

-- Physiotherapy Appointments table (bookings)
CREATE TABLE IF NOT EXISTS physiotherapy_appointments (
  id VARCHAR(255) PRIMARY KEY,
  slot_id VARCHAR(255) NOT NULL,
  athlete_id VARCHAR(255) NOT NULL,
  specialist_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slot_id) REFERENCES physiotherapy_slots(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_physiotherapy_appointments_athlete ON physiotherapy_appointments(athlete_id);
CREATE INDEX idx_physiotherapy_appointments_status ON physiotherapy_appointments(status);

-- Medical Referrals table (specialist-to-specialist referrals)
CREATE TABLE IF NOT EXISTS medical_referrals (
  id VARCHAR(255) PRIMARY KEY,
  from_specialist_id VARCHAR(255) NOT NULL,
  to_specialist_id VARCHAR(255),
  athlete_id VARCHAR(255) NOT NULL,
  referral_type VARCHAR(100),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_specialist_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_specialist_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_medical_referrals_from ON medical_referrals(from_specialist_id);
CREATE INDEX idx_medical_referrals_athlete ON medical_referrals(athlete_id);
CREATE INDEX idx_medical_referrals_status ON medical_referrals(status);

-- Training Plan Pause Requests (athlete pause requests)
CREATE TABLE IF NOT EXISTS training_plan_pause_requests (
  id VARCHAR(255) PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  athlete_id VARCHAR(255) NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  pause_start_date DATE,
  pause_end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_training_plan_pause_requests_plan ON training_plan_pause_requests(plan_id);
CREATE INDEX idx_training_plan_pause_requests_athlete ON training_plan_pause_requests(athlete_id);
CREATE INDEX idx_training_plan_pause_requests_status ON training_plan_pause_requests(status);

-- Sport Registrations table (official sport management)
CREATE TABLE IF NOT EXISTS sport_registrations (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  sport VARCHAR(100) NOT NULL,
  level VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  verified_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sport_registrations_athlete ON sport_registrations(athlete_id);
CREATE INDEX idx_sport_registrations_sport ON sport_registrations(sport);
CREATE INDEX idx_sport_registrations_verified ON sport_registrations(verified);

-- Schema v1.0 Complete: 15 tables, comprehensive indexes
