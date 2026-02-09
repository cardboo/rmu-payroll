-- Add dependents field to staffs table
-- This field stores the number of dependents for a staff member (max 3)
-- Used to multiply the dependents allowance value when saving staff

ALTER TABLE staffs
ADD COLUMN IF NOT EXISTS number_of_dependents INT DEFAULT 0 AFTER bonded;

-- Note: The number_of_dependents is used when saving/editing a staff
-- The dependents allowance amount is multiplied by this number and saved to staff_allowances
-- For example: 2 dependents * 20 cedis = 40 cedis stored as the dependents allowance
