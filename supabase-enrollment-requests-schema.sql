-- Create table for enrollment requests
CREATE TABLE IF NOT EXISTS enrollment_requests (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  organizer_address VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_enrollment_requests_event_id ON enrollment_requests(event_id);
CREATE INDEX idx_enrollment_requests_organizer ON enrollment_requests(organizer_address);
CREATE INDEX idx_enrollment_requests_email ON enrollment_requests(requester_email);
CREATE INDEX idx_enrollment_requests_status ON enrollment_requests(status);

-- Add comment
COMMENT ON TABLE enrollment_requests IS 'Stores enrollment requests from users to event organizers';

-- Add RLS
ALTER TABLE enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert enrollment requests"
ON enrollment_requests FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to read their own requests
CREATE POLICY "Users can read their own enrollment requests"
ON enrollment_requests FOR SELECT
TO authenticated
USING (requester_email = auth.email());

-- Allow organizers to view requests for their events
CREATE POLICY "Organizers can view requests for their events"
ON enrollment_requests FOR SELECT
TO authenticated
USING (true);

-- Allow organizers to update request status
CREATE POLICY "Allow authenticated users to update enrollment requests"
ON enrollment_requests FOR UPDATE
TO authenticated
USING (true);
