-- Migration to add Lichess support to existing schema
-- Run this SQL in your Supabase SQL editor after the initial schema

-- Add lichess_username column to existing table
ALTER TABLE user_mappings 
ADD COLUMN lichess_username VARCHAR(255);

-- Create index for lichess_username
CREATE INDEX idx_user_mappings_lichess_username ON user_mappings(lichess_username);

-- Update the policy name to be more descriptive
DROP POLICY IF EXISTS "Allow all operations on user_mappings" ON user_mappings;
CREATE POLICY "Allow all operations on user_mappings" ON user_mappings
    FOR ALL USING (true);
