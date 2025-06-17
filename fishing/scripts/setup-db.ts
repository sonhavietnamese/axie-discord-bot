import { readFileSync } from 'fs'

// Simple database setup using SQLite
const setupDatabase = async () => {
  try {
    // Create tables manually
    const setupSQL = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fish INTEGER DEFAULT 0 NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create fish table
CREATE TABLE IF NOT EXISTS fish (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    rarity TEXT NOT NULL,
    image TEXT,
    description TEXT
);

-- Create fish_catches table
CREATE TABLE IF NOT EXISTS fish_catches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fish_id TEXT NOT NULL,
    caught_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (fish_id) REFERENCES fish(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS fish_catches_user_id_idx ON fish_catches(user_id);
CREATE INDEX IF NOT EXISTS fish_catches_fish_id_idx ON fish_catches(fish_id);

-- Create underwater table
CREATE TABLE IF NOT EXISTS underwaters (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    rarity TEXT NOT NULL,
    image TEXT,
    description TEXT
);

-- Insert default fish data
INSERT OR IGNORE INTO fish (id, name, rarity, description) VALUES
    ('fish_1', 'Bass', 'common', 'A common freshwater fish'),
    ('fish_2', 'Trout', 'common', 'A popular game fish'),
    ('fish_3', 'Salmon', 'uncommon', 'A prized catch!'),
    ('fish_4', 'Tuna', 'rare', 'A large and valuable fish'),
    ('fish_5', 'Swordfish', 'epic', 'A majestic deep-sea predator'),
    ('fish_6', 'Golden Fish', 'legendary', 'A mythical golden fish that brings good fortune!');
`

    // Write SQL to a file
    const fs = require('fs')
    fs.writeFileSync('./setup.sql', setupSQL)

    console.log('✅ Database setup SQL file created!')
    console.log('📝 You can run: sqlite3 dev.db < setup.sql')
  } catch (error) {
    console.error('❌ Error setting up database:', error)
    process.exit(1)
  }
}

setupDatabase()
