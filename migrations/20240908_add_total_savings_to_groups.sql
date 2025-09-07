-- Add total_savings column to groups table
ALTER TABLE groups
ADD COLUMN total_savings DECIMAL(10, 2) DEFAULT 0;

-- Update existing groups to set initial total_savings based on transactions
UPDATE groups g
SET total_savings = COALESCE(
    (SELECT SUM(amount) 
     FROM transactions t 
     WHERE t.group_id = g.id 
     AND t.type = 'deposit' 
     AND t.status = 'completed'),
    0
);
