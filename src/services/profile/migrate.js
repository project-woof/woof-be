#!/usr/bin/env node

/**
 * Migration script for the profile service
 * 
 * Usage:
 * node migrate.js
 * 
 * This script will apply all migrations in the migrations directory
 * to the Cloudflare D1 database.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to migrations directory
const migrationsDir = path.join(__dirname, 'migrations');

// Get all migration files
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Sort to ensure migrations are applied in order

if (migrationFiles.length === 0) {
  console.log('No migration files found.');
  process.exit(0);
}

console.log(`Found ${migrationFiles.length} migration files.`);

// Apply each migration
migrationFiles.forEach(file => {
  const migrationPath = path.join(migrationsDir, file);
  console.log(`Applying migration: ${file}`);
  
  try {
    // Use wrangler to execute the SQL file against the D1 database
    // Note: This assumes the database is named "petsitter-db" as defined in wrangler.jsonc
    const command = `npx wrangler d1 execute petsitter-db --file=${migrationPath}`;
    
    // Execute the command
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(`Migration applied successfully: ${file}`);
    console.log(output);
  } catch (error) {
    console.error(`Error applying migration ${file}:`, error.message);
    process.exit(1);
  }
});

console.log('All migrations applied successfully.');
