-- Add opportunities and related tables
CREATE TABLE IF NOT EXISTS opportunities (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('sponsorship', 'scholarship', 'competition', 'training-camp')),
  description TEXT NOT NULL,
  organization VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2),
  sport VARCHAR(255),
  deadline DATE NOT NULL,
  eligibility TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_applications_athlete ON applications(athlete_id);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_shortlisted_status ON shortlisted(status);
