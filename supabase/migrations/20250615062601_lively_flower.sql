/*
  # Add INSERT policy for delivery_notes table

  1. Security
    - Add INSERT policy for authenticated users on delivery_notes table
    - Allow authenticated users to create delivery notes

  This migration fixes the RLS policy violation error that occurs when trying to create
  new delivery notes during the checkout process.
*/

-- Add INSERT policy for delivery_notes table
CREATE POLICY "Allow authenticated insert access on delivery_notes"
  ON delivery_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);