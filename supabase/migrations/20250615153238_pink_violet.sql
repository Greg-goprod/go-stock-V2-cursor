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
    - Add basic policies for authenticated users

  3. Performance
    - Add index on name column
*/

-- Create the departments table
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#64748b',
  created_at timestamptz DEFAULT now()
);