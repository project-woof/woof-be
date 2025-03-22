-- Rename the users table to user
ALTER TABLE users RENAME TO user;

-- Add new columns to the user table
ALTER TABLE user ADD COLUMN username TEXT;
ALTER TABLE user ADD COLUMN profile_image_url TEXT;
ALTER TABLE user ADD COLUMN latitude REAL;
ALTER TABLE user ADD COLUMN longitude REAL;
ALTER TABLE user ADD COLUMN description TEXT;
ALTER TABLE user ADD COLUMN is_petsitter INTEGER DEFAULT 0;
ALTER TABLE user ADD COLUMN last_updated TEXT;

-- Update the username column with the name column
UPDATE user SET username = name;

-- Update the profile_image_url column with the picture column
UPDATE user SET profile_image_url = picture;

-- Update the is_petsitter column based on the userType column
UPDATE user SET is_petsitter = CASE WHEN userType = 'both' THEN 1 ELSE 0 END;

-- Update the last_updated column with the updated_at column
UPDATE user SET last_updated = updated_at;

-- Rename the id column to user_id
-- SQLite doesn't support renaming columns directly, so we need to create a new table
CREATE TABLE IF NOT EXISTS user_new (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT,
  userType TEXT NOT NULL CHECK (userType IN ('petowner', 'both')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  username TEXT,
  profile_image_url TEXT,
  latitude REAL,
  longitude REAL,
  description TEXT,
  is_petsitter INTEGER DEFAULT 0,
  last_updated TEXT
);

-- Copy data from the old table to the new table
INSERT INTO user_new (
  user_id, email, name, picture, userType, created_at, updated_at,
  username, profile_image_url, latitude, longitude, description, is_petsitter, last_updated
)
SELECT
  id, email, name, picture, userType, created_at, updated_at,
  username, profile_image_url, latitude, longitude, description, is_petsitter, last_updated
FROM user;

-- Drop the old table
DROP TABLE user;

-- Rename the new table to user
ALTER TABLE user_new RENAME TO user;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON user (email);
