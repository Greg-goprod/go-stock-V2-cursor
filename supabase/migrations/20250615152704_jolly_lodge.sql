/*
  # Create departments table

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `color` (text, default gray color)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `departments` table
    - Add policies for authenticated users to read, insert, update, and delete departments

  3. Indexes
    - Add index on name for better query performance
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#64748b',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create policies for departments
CREATE POLICY "Allow authenticated read access on departments"
  ON departments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert access on departments"
  ON departments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update access on departments"
  ON departments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access on departments"
  ON departments
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS departments_name_idx ON departments (name);