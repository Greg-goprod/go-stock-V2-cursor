/*
  # Create departments table

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text, optional)
      - `color` (text, default gray)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `departments` table
    - Add policies for authenticated users to manage departments

  3. Performance
    - Add index on name column for faster queries
*/

-- Create departments table
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#64748b',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated read access on departments"
  ON departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert access on departments"
  ON departments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update access on departments"
  ON departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access on departments"
  ON departments FOR DELETE TO authenticated USING (true);

-- Create index
CREATE INDEX departments_name_idx ON departments (name);