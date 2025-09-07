-- Add abbreviation column to funds table
-- Created: 2024-01-02  
-- Description: Adds abbreviation column to funds table for display purposes

-- Add abbreviation column to funds table
ALTER TABLE funds ADD COLUMN IF NOT EXISTS abbreviation TEXT;

-- Update existing fund with abbreviation
UPDATE funds 
SET abbreviation = '블라인드2호'
WHERE id = '550e8400-e29b-41d4-a716-446655440000' AND abbreviation IS NULL;