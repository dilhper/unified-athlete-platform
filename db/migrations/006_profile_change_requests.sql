-- Migration 006: Profile Change Requests
-- Allows athletes to request profile updates that require official approval

CREATE TABLE IF NOT EXISTS profile_change_requests (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Fields being requested to change
  requested_changes JSONB NOT NULL,
  
  -- Reason for the change
  reason TEXT NOT NULL,
  
  -- Supporting document
  document_path TEXT,
  document_name TEXT,
  document_size INTEGER,
  document_mime_type VARCHAR(100),
  
  -- Approval workflow
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by VARCHAR(255) REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_user_id ON profile_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_status ON profile_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_created_at ON profile_change_requests(created_at DESC);

-- Add comment
COMMENT ON TABLE profile_change_requests IS 'Tracks athlete profile change requests that require official approval';
