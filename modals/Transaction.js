const db = require('../config/neondb');

const Transaction = {
    // Create a new transaction
    create: async (transactionData) => {
        const {
            group_id,
            user_id,
            amount,
            type,
            payment_method,
            transaction_reference,
            description,
            due_date
        } = transactionData;

        // Only include due_date in the query if it's provided
        const includeDueDate = due_date !== undefined;
        const columns = [
            'group_id', 'user_id', 'amount', 'type', 'payment_method',
            'transaction_reference', 'description'
        ];
        
        if (includeDueDate) {
            columns.push('due_date');
        }

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
            INSERT INTO transactions (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING *
        `;

        const values = [
            group_id,
            user_id,
            amount,
            type,
            payment_method,
            transaction_reference,
            description
        ];
        
        if (includeDueDate) {
            values.push(due_date);
        }

        const result = await db.query(query, values);
        return result.rows[0];
    },

    // Get transactions by user ID
    getByUserId: async (userId) => {
        const query = `
            SELECT t.*, g.name as group_name
            FROM transactions t
            JOIN groups g ON t.group_id = g.id
            WHERE t.user_id = $1
            ORDER BY t.payment_date DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    },

    // Get transactions by group ID
    getByGroupId: async (groupId) => {
        const query = `
            SELECT t.*, u.name as user_name
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE t.group_id = $1
            ORDER BY t.payment_date DESC
        `;
        const result = await db.query(query, [groupId]);
        return result.rows;
    },

    // Update transaction status
    updateStatus: async (transactionId, status) => {
        const query = `
            UPDATE transactions
            SET status = $1
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [status, transactionId]);
        return result.rows[0];
    },

    // Get transaction by reference
    getByReference: async (reference) => {
        const query = `
            SELECT *
            FROM transactions
            WHERE transaction_reference = $1
        `;
        const result = await db.query(query, [reference]);
        return result.rows[0];
    },

    // Get transaction statistics for a user
    getUserStats: async (userId) => {
        const query = `
            SELECT
                type,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM transactions
            WHERE user_id = $1
            GROUP BY type
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }
};

module.exports = Transaction;
