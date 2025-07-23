-- Create user_mappings table in Supabase
-- Run this SQL in your Supabase SQL editor

CREATE TABLE user_mappings (
    id BIGSERIAL PRIMARY KEY,
    telegram_username VARCHAR(255) NOT NULL UNIQUE,
    chess_username VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_mappings_telegram_username ON user_mappings(telegram_username);
CREATE INDEX idx_user_mappings_chess_username ON user_mappings(chess_username);

-- Enable Row Level Security (RLS)
ALTER TABLE user_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on user_mappings" ON user_mappings
    FOR ALL USING (true);

-- Optional: Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_mappings_updated_at 
    BEFORE UPDATE ON user_mappings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
