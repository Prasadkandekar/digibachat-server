const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroup,
  joinGroup,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getUserGroups,
  getLeaderGroups,
  getGroupByCode,
  getGroupMembers,
  debugJoinRequests,
  debugJoinRequestsNoAuth
} = require('../controllers/groupController');
const transactionController = require('../controllers/transactionController');
const auth = require('../middleware/authmiddleware');

// Public routes
router.get('/public/:groupCode', getGroupByCode);
router.get('/:groupId/debug-join-requests-no-auth', debugJoinRequestsNoAuth);

// Protected routes
router.use(auth);

router.post('/', createGroup);
router.get('/my-groups', getUserGroups);
router.get('/my-leader-groups', getLeaderGroups);
router.get('/:groupId', getGroup);
router.get('/:groupId/members', getGroupMembers);
router.post('/join/:groupCode', joinGroup);
router.get('/:groupId/join-requests', getJoinRequests);
router.get('/:groupId/debug-join-requests', debugJoinRequests);
router.post('/:groupId/join-requests/:requestId/approve', approveJoinRequest);
router.post('/:groupId/join-requests/:requestId/reject', rejectJoinRequest);

// Contribution routes
router.post('/:groupId/contribute', transactionController.makeContribution);
router.get('/:groupId/transactions', transactionController.getGroupTransactions);

module.exports = router;