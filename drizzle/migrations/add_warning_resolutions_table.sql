-- Create warning_resolutions table for tracking low-level operations with audit trail
CREATE TABLE IF NOT EXISTS warning_resolutions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warning_id INT NOT NULL,
  conductor_name VARCHAR(255) NOT NULL,
  resolved_by_user_id INT NOT NULL,
  resolved_by_email VARCHAR(320) NOT NULL,
  resolved_by_name VARCHAR(255) NOT NULL,
  resolution_type ENUM('manual', 'ai_assisted') NOT NULL DEFAULT 'manual',
  resolution_reason TEXT,
  resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (warning_id) REFERENCES warnings(id) ON DELETE CASCADE,
  INDEX idx_warning_id (warning_id),
  INDEX idx_conductor_name (conductor_name),
  INDEX idx_resolved_by_user_id (resolved_by_user_id),
  INDEX idx_resolved_at (resolved_at)
);

-- Add column to warnings table to track resolution status
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL;
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS resolved_by_user_id INT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_warnings_resolved ON warnings(resolved, resolved_at);
