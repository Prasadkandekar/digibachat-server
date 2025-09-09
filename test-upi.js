// Test script for UPI payment functionality
const UPIService = require('./services/upiService');

console.log('Testing UPI Service...\n');

// Test UPI ID validation
console.log('1. Testing UPI ID validation:');
const validUPIIds = [
  'test@paytm',
  'user@ybl',
  'name@okaxis',
  'user123@upi'
];

const invalidUPIIds = [
  'invalid-email',
  'test@',
  '@paytm',
  'test.paytm'
];

validUPIIds.forEach(upiId => {
  console.log(`  ${upiId}: ${UPIService.validateUPIId(upiId) ? '✓ Valid' : '✗ Invalid'}`);
});

invalidUPIIds.forEach(upiId => {
  console.log(`  ${upiId}: ${UPIService.validateUPIId(upiId) ? '✗ Should be invalid' : '✓ Correctly invalid'}`);
});

// Test UPI link generation
console.log('\n2. Testing UPI link generation:');
const upiData = UPIService.createGroupContributionUPI({
  groupLeaderUPI: 'test@paytm',
  groupLeaderName: 'Test Leader',
  amount: 1000,
  groupName: 'Test Group',
  memberName: 'Test Member'
});

console.log('Generated UPI data:');
console.log(`  Transaction ID: ${upiData.upiTransactionId}`);
console.log(`  UPI Link: ${upiData.upiLink}`);
console.log(`  Note: ${upiData.note}`);

// Test amount formatting
console.log('\n3. Testing amount formatting:');
const amounts = [100, 1000.50, 2500.75, 10000];
amounts.forEach(amount => {
  console.log(`  ${amount} -> ${UPIService.formatAmount(amount)}`);
});

console.log('\nUPI Service test completed!');
