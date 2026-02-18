-- Migration: Add task-based structure for training plans
-- Description: Replace sessions with tasks/phases, add completion status, athlete submissions

-- Add completion_status to training_plans table
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS completion_status VARCHAR(50) 
CHECK (completion_status IN ('in_progress', 'successful', 'unsuccessful')) 
DEFAULT 'in_progress';

-- Create training_plan_tasks table (replaces the need for separate sessions)
CREATE TABLE IF NOT EXISTS training_plan_tasks (
  id VARCHAR(255) PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  coach_attachments TEXT[], -- Array of file paths for coach-uploaded materials
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
);

-- Create task_submissions table for athlete submissions
CREATE TABLE IF NOT EXISTS task_submissions (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL,
  athlete_id VARCHAR(255) NOT NULL,
  attachments TEXT[], -- Array of file paths for athlete-uploaded materials
  notes TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES training_plan_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(task_id, athlete_id) -- Each athlete can only submit once per task, but can update
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_plan_tasks_plan ON training_plan_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_training_plan_tasks_dates ON training_plan_tasks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_athlete ON task_submissions(athlete_id);
