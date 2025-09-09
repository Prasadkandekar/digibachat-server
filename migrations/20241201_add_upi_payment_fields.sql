-- Add UPI payment fields to groups table
ALTER TABLE groups ADD COLUMN leader_upi_id VARCHAR(255);
ALTER TABLE groups ADD COLUMN leader_upi_name VARCHAR(255);

-- Add UPI payment fields to transactions table
ALTER TABLE transactions ADD COLUMN upi_transaction_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN upi_payment_link TEXT;
ALTER TABLE transactions ADD COLUMN qr_code_url TEXT;

-- Add UPI payment status
ALTER TABLE transactions ADD COLUMN upi_status VARCHAR(20) DEFAULT 'pending' CHECK (upi_status IN ('pending', 'initiated', 'completed', 'failed', 'cancelled'));

-- Create index for UPI transaction lookups
CREATE INDEX idx_transactions_upi_transaction_id ON transactions(upi_transaction_id);
CREATE INDEX idx_transactions_upi_status ON transactions(upi_status);

-- Add UPI payment verification table
CREATE TABLE upi_payment_verifications (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    upi_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    verification_attempts INTEGER DEFAULT 0,
    last_verification_attempt TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- Create index for UPI verification lookups
CREATE INDEX idx_upi_verifications_transaction_id ON upi_payment_verifications(transaction_id);
CREATE INDEX idx_upi_verifications_upi_transaction_id ON upi_payment_verifications(upi_transaction_id);
CREATE INDEX idx_upi_verifications_status ON upi_payment_verifications(verification_status);
    