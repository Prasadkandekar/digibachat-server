-- Fix transaction type constraint to use 'deposit' instead of 'contribution'
-- First, drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add the correct constraint with all valid transaction types
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'loan', 'repayment', 'withdrawal'));

-- Also ensure payment_method constraint is correct
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
CHECK (payment_method IN ('upi', 'bank_transfer'));

-- Ensure status constraint is correct
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed'));

-- Ensure upi_status constraint is correct
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_upi_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_upi_status_check 
CHECK (upi_status IN ('pending', 'initiated', 'completed', 'failed', 'cancelled'));
