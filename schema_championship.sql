-- Championship scoring system schema
-- Run this SQL in your Supabase SQL editor to add championship features

-- Create user_scores table to track championship points
CREATE TABLE user_scores (
    id BIGSERIAL PRIMARY KEY,
    telegram_username VARCHAR(255) NOT NULL UNIQUE,
    total_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (telegram_username) REFERENCES user_mappings(telegram_username) ON DELETE CASCADE
);

-- Create daily_champions table to track daily winners
CREATE TABLE daily_champions (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    first_place VARCHAR(255) NOT NULL,
    second_place VARCHAR(255),
    third_place VARCHAR(255),
    first_score INTEGER DEFAULT 300,
    second_score INTEGER DEFAULT 200,
    third_score INTEGER DEFAULT 100,
    win_rate_first DECIMAL(5,2),
    win_rate_second DECIMAL(5,2),
    win_rate_third DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- Create indexes for better performance
CREATE INDEX idx_user_scores_telegram_username ON user_scores(telegram_username);
CREATE INDEX idx_user_scores_total_score ON user_scores(total_score DESC);
CREATE INDEX idx_daily_champions_date ON daily_champions(date DESC);

-- Enable Row Level Security
ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_champions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on user_scores" ON user_scores
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on daily_champions" ON daily_champions
    FOR ALL USING (true);

-- Function to automatically update updated_at column for user_scores
CREATE OR REPLACE FUNCTION update_user_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_scores
CREATE TRIGGER update_user_scores_updated_at_trigger
    BEFORE UPDATE ON user_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_user_scores_updated_at();

-- Initialize scores for existing users
INSERT INTO user_scores (telegram_username, total_score)
SELECT telegram_username, 0
FROM user_mappings
ON CONFLICT (telegram_username) DO NOTHING;
