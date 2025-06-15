/*
  # Create departments table

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `color` (text, default gray)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `departments` table
    - Add policies for authenticated users to manage departments
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

-- Simple policies for authenticated users
CREATE POLICY "departments_select_policy" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert_policy" ON departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "departments_update_policy" ON departments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "departments_delete_policy" ON departments FOR DELETE TO authenticated USING (true);

-- Add index for performance
CREATE INDEX departments_name_idx ON departments (name);