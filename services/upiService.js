const crypto = require('crypto');
const QRCode = require('qrcode');

class UPIService {
    /**
     * Generate UPI payment link
     * @param {Object} params - UPI payment parameters
     * @param {string} params.upiId - Receiver UPI ID
     * @param {string} params.payeeName - Receiver name
     * @param {number} params.amount - Amount to pay
     * @param {string} params.note - Transaction note
     * @returns {string} UPI payment link
     */
    static generateUPILink({ upiId, payeeName, amount, note = '' }) {
        const baseUrl = 'upi://pay';
        const params = new URLSearchParams();
        
        params.append('pa', upiId);
        params.append('pn', payeeName);
        params.append('am', amount.toString());
        params.append('cu', 'INR');
        if (note) {
            params.append('tn', note);
        }
        
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Generate QR code for UPI payment link
     * @param {string} upiLink - UPI payment link
     * @returns {Promise<string>} Base64 encoded QR code image
     */
    static async generateQRCode(upiLink) {
        try {
            const qrCodeDataURL = await QRCode.toDataURL(upiLink, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            return qrCodeDataURL;
        } catch (error) {
            console.error('Error generating QR code:', error);
            throw new Error('Failed to generate QR code');
        }
    }

    /**
     * Generate unique UPI transaction ID
     * @returns {string} Unique transaction ID
     */
    static generateUPITransactionId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        return `UPI_${timestamp}_${random}`.toUpperCase();
    }

    /**
     * Validate UPI ID format
     * @param {string} upiId - UPI ID to validate
     * @returns {boolean} True if valid UPI ID format
     */
    static validateUPIId(upiId) {
        const upiIdRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
        return upiIdRegex.test(upiId);
    }

    /**
     * Create UPI payment data for group contribution
     * @param {Object} params - Payment parameters
     * @param {string} params.groupLeaderUPI - Group leader's UPI ID
     * @param {string} params.groupLeaderName - Group leader's name
     * @param {number} params.amount - Contribution amount
     * @param {string} params.groupName - Group name
     * @param {string} params.memberName - Member name making contribution
     * @returns {Object} UPI payment data
     */
    static createGroupContributionUPI({ groupLeaderUPI, groupLeaderName, amount, groupName, memberName }) {
        const upiTransactionId = this.generateUPITransactionId();
        const note = `Contribution to ${groupName} by ${memberName}`;
        
        const upiLink = this.generateUPILink({
            upiId: groupLeaderUPI,
            payeeName: groupLeaderName,
            amount: amount,
            note: note
        });

        return {
            upiTransactionId,
            upiLink,
            note
        };
    }

    /**
     * Format amount for UPI (ensure proper decimal formatting)
     * @param {number} amount - Amount to format
     * @returns {string} Formatted amount string
     */
    static formatAmount(amount) {
        return parseFloat(amount).toFixed(2);
    }
}

module.exports = UPIService;
