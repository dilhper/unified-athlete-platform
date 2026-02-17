-- v1.3 Migration: Document Submissions for Role-Based Registration
-- Allows athlete, official, and specialist to submit documents for verification

CREATE TABLE document_submissions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('athlete', 'coach', 'specialist', 'official')),
  document_type VARCHAR(100) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Document requirements reference
-- Athlete: Training history, certifications, medical clearance, or previous achievements
-- Specialist: License, credentials, certifications
-- Official: Background check, credentials, proof of authority

-- Indexes for efficient querying
CREATE INDEX idx_document_submissions_user ON document_submissions(user_id);
CREATE INDEX idx_document_submissions_status ON document_submissions(status);
CREATE INDEX idx_document_submissions_role ON document_submissions(role);
CREATE INDEX idx_document_submissions_submitted_at ON document_submissions(submitted_at DESC);
CREATE INDEX idx_document_submissions_approved_by ON document_submissions(approved_by);
