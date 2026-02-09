-- Add dependents field to staffs table
-- This field stores the number of dependents for a staff member
-- Used to multiply the dependents allowance value during payroll calculation

ALTER TABLE staffs
ADD COLUMN IF NOT EXISTS number_of_dependents INT DEFAULT 0 AFTER bonded;

-- Add is_dependents_allowance flag to allowances table
-- This identifies which allowance should be multiplied by the number of dependents
ALTER TABLE allowances
ADD COLUMN IF NOT EXISTS is_dependents_allowance BOOLEAN DEFAULT FALSE AFTER is_bonded;

-- Add a comment to explain the fields:
-- The number_of_dependents field in staffs is used as a multiplier for the dependents allowance
-- The is_dependents_allowance field in allowances identifies which allowance should be multiplied
-- If a staff has 3 dependents and the dependents allowance is 100, the total would be 300
