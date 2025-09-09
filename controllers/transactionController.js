const db = require('../config/neondb');
const { generateTransactionReference } = require('../services/transactionService');
const UPIService = require('../services/upiService');

const transactionController = {
    // Make a contribution to a group
    makeContribution: async (req, res) => {
        try {
            const { groupId } = req.params;
            const { paymentMethod } = req.body;
            const userId = req.user.id;

            // Verify group membership
            const membershipQuery = `
                SELECT * FROM group_members
                WHERE group_id = $1 AND user_id = $2
            `;
            const membershipResult = await db.query(membershipQuery, [groupId, userId]);
            const membership = membershipResult.rows[0];

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this group'
                });
            }

            // Get group details for contribution amount
            const groupQuery = `SELECT * FROM groups WHERE id = $1`;
            const groupResult = await db.query(groupQuery, [groupId]);
            const group = groupResult.rows[0];

            if (!group) {
                return res.status(404).json({
                    success: false,
                    message: 'Group not found'
                });
            }

            // Create transaction record
            const transactionQuery = `
                INSERT INTO transactions (
                    group_id, user_id, amount, type, payment_method,
                    transaction_reference, status, description
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;

            const transactionValues = [
                groupId,
                userId,
                group.savings_amount,
                'deposit',
                paymentMethod,
                generateTransactionReference(),
                'completed',
                `Contribution to ${group.name}`
            ];

            const transactionResult = await db.query(transactionQuery, transactionValues);
            const transaction = transactionResult.rows[0];

            // Update member's contribution record
            const updateBalanceQuery = `
                UPDATE group_members
                SET current_balance = current_balance + $1
                WHERE group_id = $2 AND user_id = $3
            `;
            await db.query(updateBalanceQuery, [group.savings_amount, groupId, userId]);

            // Update group's total savings
            const updateGroupSavingsQuery = `
                UPDATE groups
                SET total_savings = total_savings + $1
                WHERE id = $2
                RETURNING total_savings;
            `;
            await db.query(updateGroupSavingsQuery, [group.savings_amount, groupId]);

            res.json({
                success: true,
                message: 'Contribution processed successfully',
                data: {
                    transactionId: transaction.id,
                    amount: transaction.amount,
                    status: transaction.status,
                    paymentMethod: transaction.payment_method,
                    reference: transaction.transaction_reference
                }
            });

        } catch (error) {
            console.error('Contribution error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process contribution'
            });
        }
    },

    // Get transaction history for a group
    getGroupTransactions: async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.user.id;

            // Verify group membership
            const membershipQuery = `
                SELECT * FROM group_members
                WHERE group_id = $1 AND user_id = $2
            `;
            const membershipResult = await db.query(membershipQuery, [groupId, userId]);
            
            if (!membershipResult.rows[0]) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this group'
                });
            }

            // Get all transactions for the group with user details
            const transactionsQuery = `
                SELECT t.*, u.name as user_name, g.name as group_name
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                JOIN groups g ON t.group_id = g.id
                WHERE t.group_id = $1
                ORDER BY t.created_at DESC
            `;
            const transactionsResult = await db.query(transactionsQuery, [groupId]);

            res.json({
                success: true,
                data: {
                    transactions: transactionsResult.rows
                }
            });

        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions'
            });
        }
    },

    // Get user's transaction history across all groups
    getUserTransactions: async (req, res) => {
        try {
            const userId = req.user.id;

            const query = `
                SELECT 
                    t.*,
                    g.name as group_name
                FROM transactions t
                JOIN groups g ON t.group_id = g.id
                WHERE t.user_id = $1
                ORDER BY t.created_at DESC
            `;
            
            const result = await db.query(query, [userId]);

            res.json({
                success: true,
                data: {
                    transactions: result.rows
                }
            });

        } catch (error) {
            console.error('Get user transactions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions'
            });
        }
    },

    // Get upcoming contributions
    getUpcomingContributions: async (req, res) => {
        try {
            const userId = req.user.id;
            
            const query = `
                SELECT 
                    g.name as group_name,
                    g.savings_amount,
                    g.savings_frequency,
                    gm.current_balance,
                    (
                        SELECT created_at 
                        FROM transactions 
                        WHERE user_id = $1 
                        AND group_id = g.id 
                        AND type = 'deposit'
                        ORDER BY created_at DESC
                        LIMIT 1
                    ) as last_contribution_date
                FROM groups g
                JOIN group_members gm ON g.id = gm.group_id
                WHERE gm.user_id = $1
            `;
            
            const result = await db.query(query, [userId]);
            
            // Calculate next due dates based on last contribution
            const upcomingContributions = result.rows.map(row => {
                const lastDate = row.last_contribution_date || new Date();
                const nextDueDate = calculateNextDueDate(row.savings_frequency, lastDate);
                
                return {
                    ...row,
                    next_due_date: nextDueDate
                };
            });

            res.json({
                success: true,
                data: {
                    upcomingContributions
                }
            });

        } catch (error) {
            console.error('Get upcoming contributions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch upcoming contributions'
            });
        }
    },

    // Get group savings summary - total contributions by each member
    getGroupSavingsSummary: async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.user.id;

            // Verify group membership
            const membershipQuery = `
                SELECT * FROM group_members
                WHERE group_id = $1 AND user_id = $2
            `;
            const membershipResult = await db.query(membershipQuery, [groupId, userId]);
            
            if (!membershipResult.rows[0]) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this group'
                });
            }

            // Get total contributions by each member
            const savingsQuery = `
                SELECT 
                    u.id as user_id,
                    u.name,
                    u.email,
                    gm.current_balance,
                    gm.role,
                    COALESCE(SUM(t.amount), 0) as total_contributed,
                    COUNT(t.id) as total_transactions
                FROM group_members gm
                JOIN users u ON gm.user_id = u.id
                LEFT JOIN transactions t ON t.user_id = u.id AND t.group_id = $1 AND t.type = 'deposit' AND t.status = 'completed'
                WHERE gm.group_id = $1 AND gm.status = 'approved'
                GROUP BY u.id, u.name, u.email, gm.current_balance, gm.role
                ORDER BY total_contributed DESC
            `;
            const savingsResult = await db.query(savingsQuery, [groupId]);

            // Get group details for context
            const groupQuery = `SELECT name, savings_amount FROM groups WHERE id = $1`;
            const groupResult = await db.query(groupQuery, [groupId]);
            const group = groupResult.rows[0];

            res.json({
                success: true,
                data: {
                    group: {
                        name: group.name,
                        expected_contribution: group.savings_amount
                    },
                    members: savingsResult.rows,
                    total_group_savings: savingsResult.rows.reduce((sum, member) => sum + parseFloat(member.total_contributed), 0)
                }
            });

        } catch (error) {
            console.error('Get group savings summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch group savings summary'
            });
        }
    },

    // Get user total savings across all groups
    getUserTotalSavings: async (req, res) => {
        try {
            const userId = req.user.id;

            // Get user's total savings across all groups
            const totalSavingsQuery = `
                SELECT 
                    COALESCE(SUM(t.amount), 0) as total_savings,
                    COUNT(DISTINCT t.group_id) as groups_contributed_to,
                    COUNT(t.id) as total_contributions
                FROM transactions t
                WHERE t.user_id = $1 AND t.type = 'deposit' AND t.status = 'completed'
            `;
            const totalSavingsResult = await db.query(totalSavingsQuery, [userId]);
            const totalSavings = totalSavingsResult.rows[0];

            // Get breakdown by group
            const groupBreakdownQuery = `
                SELECT 
                    g.name as group_name,
                    g.id as group_id,
                    g.savings_amount as expected_amount,
                    g.savings_frequency,
                    COALESCE(SUM(t.amount), 0) as total_contributed,
                    COUNT(t.id) as contributions_count,
                    gm.current_balance
                FROM groups g
                JOIN group_members gm ON g.id = gm.group_id
                LEFT JOIN transactions t ON t.user_id = $1 AND t.group_id = g.id AND t.type = 'deposit' AND t.status = 'completed'
                WHERE gm.user_id = $1 AND gm.status = 'approved'
                GROUP BY g.id, g.name, g.savings_amount, g.savings_frequency, gm.current_balance
                ORDER BY total_contributed DESC
            `;
            const groupBreakdownResult = await db.query(groupBreakdownQuery, [userId]);

            res.json({
                success: true,
                data: {
                    total_savings: parseFloat(totalSavings.total_savings),
                    groups_contributed_to: parseInt(totalSavings.groups_contributed_to),
                    total_contributions: parseInt(totalSavings.total_contributions),
                    group_breakdown: groupBreakdownResult.rows.map(row => ({
                        ...row,
                        total_contributed: parseFloat(row.total_contributed),
                        current_balance: parseFloat(row.current_balance),
                        expected_amount: parseFloat(row.expected_amount)
                    }))
                }
            });

        } catch (error) {
            console.error('Get user total savings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user total savings'
            });
        }
    },

    // Get user contributions across all groups
    getUserContributions: async (req, res) => {
        try {
            const userId = req.user.id;

            // Get user's contributions by group
            const contributionsQuery = `
                SELECT 
                    g.id as group_id,
                    g.name as group_name,
                    COALESCE(SUM(t.amount), 0) as total_amount,
                    COUNT(t.id) as contributions_count
                FROM groups g
                JOIN group_members gm ON g.id = gm.group_id
                LEFT JOIN transactions t ON t.user_id = $1 AND t.group_id = g.id AND t.type = 'deposit' AND t.status = 'completed'
                WHERE gm.user_id = $1 AND gm.status = 'approved'
                GROUP BY g.id, g.name
                ORDER BY g.name
            `;
            const contributionsResult = await db.query(contributionsQuery, [userId]);

            res.json({
                success: true,
                data: {
                    contributions: contributionsResult.rows.map(row => ({
                        ...row,
                        total_amount: parseFloat(row.total_amount)
                    }))
                }
            });

        } catch (error) {
            console.error('Get user contributions error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user contributions'
            });
        }
    },

    // Generate UPI payment link for group contribution
    generateUPIPayment: async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.user.id;

            // Verify group membership
            const membershipQuery = `
                SELECT * FROM group_members
                WHERE group_id = $1 AND user_id = $2
            `;
            const membershipResult = await db.query(membershipQuery, [groupId, userId]);
            const membership = membershipResult.rows[0];

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this group'
                });
            }

            // Get group details and leader information
            const groupQuery = `
                SELECT g.*, u.name as leader_name, u.email as leader_email
                FROM groups g
                LEFT JOIN users u ON g.created_by = u.id
                WHERE g.id = $1
            `;
            const groupResult = await db.query(groupQuery, [groupId]);
            const group = groupResult.rows[0];

            if (!group) {
                return res.status(404).json({
                    success: false,
                    message: 'Group not found'
                });
            }

            // Check if group leader has UPI ID configured
            if (!group.leader_upi_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Group leader has not configured UPI payment details'
                });
            }

            // Get member name
            const memberQuery = `SELECT name FROM users WHERE id = $1`;
            const memberResult = await db.query(memberQuery, [userId]);
            const memberName = memberResult.rows[0]?.name || 'Member';

            // Generate UPI payment data
            const upiData = UPIService.createGroupContributionUPI({
                groupLeaderUPI: group.leader_upi_id,
                groupLeaderName: group.leader_upi_name || group.leader_name,
                amount: group.savings_amount,
                groupName: group.name,
                memberName: memberName
            });

            // Generate QR code
            const qrCodeDataURL = await UPIService.generateQRCode(upiData.upiLink);

            // Create transaction record with pending status
            const transactionQuery = `
                INSERT INTO transactions (
                    group_id, user_id, amount, type, payment_method,
                    transaction_reference, status, description,
                    upi_transaction_id, upi_payment_link, qr_code_url, upi_status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;

            const transactionValues = [
                groupId,
                userId,
                group.savings_amount,
                'deposit',
                'upi',
                generateTransactionReference(),
                'pending',
                upiData.note,
                upiData.upiTransactionId,
                upiData.upiLink,
                qrCodeDataURL,
                'initiated'
            ];

            const transactionResult = await db.query(transactionQuery, transactionValues);
            const transaction = transactionResult.rows[0];

            res.json({
                success: true,
                message: 'UPI payment link generated successfully',
                data: {
                    transactionId: transaction.id,
                    upiTransactionId: upiData.upiTransactionId,
                    upiLink: upiData.upiLink,
                    qrCode: qrCodeDataURL,
                    amount: transaction.amount,
                    groupName: group.name,
                    leaderName: group.leader_upi_name || group.leader_name,
                    note: upiData.note
                }
            });

        } catch (error) {
            console.error('Generate UPI payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate UPI payment link'
            });
        }
    },

    // Verify UPI payment status
    verifyUPIPayment: async (req, res) => {
        try {
            const { transactionId } = req.params;
            const userId = req.user.id;

            // Get transaction details
            const transactionQuery = `
                SELECT t.*, g.name as group_name
                FROM transactions t
                JOIN groups g ON t.group_id = g.id
                WHERE t.id = $1 AND t.user_id = $2
            `;
            const transactionResult = await db.query(transactionQuery, [transactionId, userId]);
            const transaction = transactionResult.rows[0];

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            // Return current status without auto-completing
            // In a real implementation, you would integrate with UPI payment gateway APIs
            // and verify payment status through webhooks or API calls

            res.json({
                success: true,
                data: {
                    transactionId: transaction.id,
                    status: transaction.status,
                    upiStatus: transaction.upi_status,
                    amount: transaction.amount,
                    groupName: transaction.group_name,
                    paymentDate: transaction.created_at
                }
            });

        } catch (error) {
            console.error('Verify UPI payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify UPI payment'
            });
        }
    },

    // Update group leader UPI details
    updateGroupUPIDetails: async (req, res) => {
        try {
            const { groupId } = req.params;
            const { upiId, upiName } = req.body;
            const userId = req.user.id;

            // Verify user is group leader
            const membershipQuery = `
                SELECT role FROM group_members
                WHERE group_id = $1 AND user_id = $2 AND status = 'approved'
            `;
            const membershipResult = await db.query(membershipQuery, [groupId, userId]);
            const membership = membershipResult.rows[0];

            if (!membership || membership.role !== 'leader') {
                return res.status(403).json({
                    success: false,
                    message: 'Only group leaders can update UPI details'
                });
            }

            // Validate UPI ID format
            if (!UPIService.validateUPIId(upiId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid UPI ID format'
                });
            }

            // Update group UPI details
            const updateQuery = `
                UPDATE groups 
                SET leader_upi_id = $1, leader_upi_name = $2
                WHERE id = $3
                RETURNING *
            `;
            const updateResult = await db.query(updateQuery, [upiId, upiName, groupId]);

            res.json({
                success: true,
                message: 'UPI details updated successfully',
                data: {
                    upiId: updateResult.rows[0].leader_upi_id,
                    upiName: updateResult.rows[0].leader_upi_name
                }
            });

        } catch (error) {
            console.error('Update UPI details error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update UPI details'
            });
        }
    },

    // Manually verify and complete UPI payment (for group leaders or payment initiator)
    completeUPIPayment: async (req, res) => {
        try {
            const { transactionId } = req.params;
            const userId = req.user.id;

            // Get transaction details
            const transactionQuery = `
                SELECT t.*, g.name as group_name, g.created_by
                FROM transactions t
                JOIN groups g ON t.group_id = g.id
                WHERE t.id = $1
            `;
            const transactionResult = await db.query(transactionQuery, [transactionId]);
            const transaction = transactionResult.rows[0];

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            // Check if user is the group leader OR the person who initiated the payment
            const isGroupLeader = transaction.created_by === userId;
            const isPaymentInitiator = transaction.user_id === userId;
            
            if (!isGroupLeader && !isPaymentInitiator) {
                return res.status(403).json({
                    success: false,
                    message: 'Only group leaders or payment initiators can verify payments'
                });
            }

            // Check if payment is already completed
            if (transaction.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Payment is already completed'
                });
            }

            // Update transaction status to completed
            await db.query('BEGIN');
            
            // Update transaction status
            await db.query(`
                UPDATE transactions 
                SET status = 'completed', upi_status = 'completed'
                WHERE id = $1
            `, [transactionId]);

            // Update member's contribution record
            await db.query(`
                UPDATE group_members
                SET current_balance = current_balance + $1
                WHERE group_id = $2 AND user_id = $3
            `, [transaction.amount, transaction.group_id, transaction.user_id]);

            // Update group's total savings
            await db.query(`
                UPDATE groups
                SET total_savings = total_savings + $1
                WHERE id = $2
            `, [transaction.amount, transaction.group_id]);

            await db.query('COMMIT');

            res.json({
                success: true,
                message: 'Payment verified and completed successfully',
                data: {
                    transactionId: transaction.id,
                    amount: transaction.amount,
                    groupName: transaction.group_name,
                    status: 'completed'
                }
            });

        } catch (error) {
            await db.query('ROLLBACK');
            console.error('Complete UPI payment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to complete payment verification'
            });
        }
    }
};

// Helper function to calculate next due date based on frequency
function calculateNextDueDate(frequency, lastDate = new Date()) {
    const nextDate = new Date(lastDate);

    switch (frequency) {
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        default:
            nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
    }

    return nextDate;
}

module.exports = transactionController;
