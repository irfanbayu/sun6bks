-- Add venue_maps_url column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_maps_url TEXT;
