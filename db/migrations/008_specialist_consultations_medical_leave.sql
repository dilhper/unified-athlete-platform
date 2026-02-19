-- Migration 008: Replace Physiotherapy with Specialist Consultations and Medical Leave Requests
-- This migration removes physiotherapy booking system and adds:
-- 1. Specialist consultation requests
-- 2. Medical leave requests with specialist reviews

-- Drop old physiotherapy tables
DROP TABLE IF EXISTS physiotherapy_appointments CASCADE;
DROP TABLE IF EXISTS physiotherapy_slots CASCADE;

-- Specialist Consultation Requests Table
CREATE TABLE IF NOT EXISTS specialist_consultations (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  specialist_id VARCHAR(255),
  consultation_type VARCHAR(100) NOT NULL, -- 'general', 'sports_medicine', 'nutrition', 'psychology', etc.
  reason TEXT NOT NULL,
  symptoms TEXT,
  urgency VARCHAR(50) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  preferred_date TIMESTAMP WITHOUT TIME ZONE,
  scheduled_date TIMESTAMP WITHOUT TIME ZONE,
  consultation_notes TEXT, -- Specialist's notes after consultation
  recommendation TEXT, -- Specialist's recommendation
  attachments TEXT[], -- Medical documents, images, etc.
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_specialist_consultations_athlete ON specialist_consultations(athlete_id);
CREATE INDEX idx_specialist_consultations_specialist ON specialist_consultations(specialist_id);
CREATE INDEX idx_specialist_consultations_status ON specialist_consultations(status);
CREATE INDEX idx_specialist_consultations_created_at ON specialist_consultations(created_at DESC);

-- Medical Leave Requests Table
CREATE TABLE IF NOT EXISTS medical_leave_requests (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  specialist_id VARCHAR(255),
  leave_type VARCHAR(100) NOT NULL, -- 'injury', 'illness', 'surgery_recovery', 'mental_health', 'other'
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER,
  medical_certificate_path TEXT,
  medical_certificate_name TEXT,
  medical_certificate_size INTEGER,
  status VARCHAR(50) DEFAULT 'pending_specialist_review' CHECK (status IN (
    'pending_specialist_review',
    'specialist_reviewed',
    'pending_coach_decision',
    'approved',
    'rejected',
    'cancelled'
  )),
  specialist_review TEXT, -- Specialist's medical review
  specialist_recommendation VARCHAR(50), -- 'approve_full_rest', 'approve_modified_training', 'needs_examination', 'reject'
  specialist_reviewed_at TIMESTAMP WITHOUT TIME ZONE,
  coach_decision VARCHAR(50), -- 'stop_training', 'continue_modified', 'continue_normal'
  coach_notes TEXT,
  coach_decided_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (specialist_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_medical_leave_requests_athlete ON medical_leave_requests(athlete_id);
CREATE INDEX idx_medical_leave_requests_coach ON medical_leave_requests(coach_id);
CREATE INDEX idx_medical_leave_requests_specialist ON medical_leave_requests(specialist_id);
CREATE INDEX idx_medical_leave_requests_status ON medical_leave_requests(status);
CREATE INDEX idx_medical_leave_requests_created_at ON medical_leave_requests(created_at DESC);

-- Consultation Messages Table (extends the messaging system)
-- This links consultation/leave requests to message threads
CREATE TABLE IF NOT EXISTS consultation_messages (
  id VARCHAR(255) PRIMARY KEY,
  consultation_id VARCHAR(255),
  medical_leave_id VARCHAR(255),
  message_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES specialist_consultations(id) ON DELETE CASCADE,
  FOREIGN KEY (medical_leave_id) REFERENCES medical_leave_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_consultation_messages_consultation ON consultation_messages(consultation_id);
CREATE INDEX idx_consultation_messages_medical_leave ON consultation_messages(medical_leave_id);
CREATE INDEX idx_consultation_messages_message ON consultation_messages(message_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_specialist_consultations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_specialist_consultations_updated_at
BEFORE UPDATE ON specialist_consultations
FOR EACH ROW
EXECUTE FUNCTION update_specialist_consultations_updated_at();

CREATE TRIGGER trigger_update_medical_leave_requests_updated_at
BEFORE UPDATE ON medical_leave_requests
FOR EACH ROW
EXECUTE FUNCTION update_specialist_consultations_updated_at();

COMMENT ON TABLE specialist_consultations IS 'Athletic specialist/doctor consultation requests and records';
COMMENT ON TABLE medical_leave_requests IS 'Medical leave requests with specialist review and coach decision workflow';
COMMENT ON TABLE consultation_messages IS 'Links consultation/leave requests to message threads for communication';
