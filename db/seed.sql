-- Seed users
INSERT INTO users (id, email, phone, name, role, password_hash, athlete_type, location, is_admin, email_verified, created_at)
VALUES
  ('u1', 'athlete1@example.com', '0712345678', 'Nethmi Perera', 'athlete', NULL, 'student', 'Colombo', FALSE, TRUE, NOW()),
  ('u2', 'coach1@example.com', '0723456789', 'Kasun Silva', 'coach', NULL, NULL, 'Kandy', FALSE, TRUE, NOW()),
  ('u3', 'specialist1@example.com', '0776543210', 'Dr. Nimal Fernando', 'specialist', NULL, NULL, 'Galle', FALSE, TRUE, NOW()),
  ('u4', 'isurudp5@gmail.com', '0701234567', 'Official Admin', 'official', '$2b$10$oyCPkf9OhqqGxFJtgFsGbebu68VZ9gPrlI/EoYTnzujpX8oan6c0u', NULL, 'Colombo', TRUE, TRUE, NOW());

-- Seed achievements
INSERT INTO achievements (id, athlete_id, title, description, date, category, status, created_at)
VALUES
  ('a1', 'u1', 'National Championship Gold', 'Won 100m sprint', '2024-08-12', 'competition', 'pending', NOW());

-- Seed training plans
INSERT INTO training_plans (id, name, description, coach_id, status, mode, start_date, end_date, progress, created_at)
VALUES
  ('tp1', 'Speed Development', 'Sprint drills and endurance', 'u2', 'active', 'both', '2025-01-01', '2025-06-30', 30, NOW());

-- Link athlete to training plan
INSERT INTO training_plan_athletes (plan_id, athlete_id)
VALUES
  ('tp1', 'u1');

-- Seed training sessions
INSERT INTO training_sessions (id, plan_id, name, date, completed, mode, duration, created_at)
VALUES
  ('ts1', 'tp1', 'Sprint Intervals', '2025-02-10', false, 'physical', 60, NOW());

-- Seed daily training form
INSERT INTO daily_training_forms (id, athlete_id, session_id, date, duration, intensity, mood, notes, submitted_at)
VALUES
  ('df1', 'u1', 'ts1', '2025-02-10', 60, 'high', 'good', 'Felt strong, good recovery', NOW());

-- Seed notifications
INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
VALUES
  ('n1', 'u1', 'training', 'New Training Plan', 'You were added to Speed Development plan.', false, NOW());
