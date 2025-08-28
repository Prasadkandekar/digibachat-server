const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroup,
  joinGroup,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  removeMember,
  leaveGroup,
  getUserGroups
} = require('../controllers/groupController');
const auth = require('../middleware/authmiddleware');
const { isGroupLeader, isGroupMember } = require('../middleware/groupAuth');

// All routes require authentication
router.use(auth);

// Create group
router.post('/', createGroup);

// Get user's groups
router.get('/my-groups', getUserGroups);

// Join group using code
router.post('/join/:groupCode', joinGroup);

// Get group details (members only)
router.get('/:groupId', isGroupMember, getGroup);

// Get join requests (leaders only)
router.get('/:groupId/join-requests', isGroupLeader, getJoinRequests);

// Approve join request (leaders only)
router.post('/:groupId/join-requests/:requestId/approve', isGroupLeader, approveJoinRequest);

// Reject join request (leaders only)
router.post('/:groupId/join-requests/:requestId/reject', isGroupLeader, rejectJoinRequest);

// Remove member (leaders only)
router.delete('/:groupId/members/:userId', isGroupLeader, removeMember);

// Leave group (members only)
router.delete('/:groupId/leave', isGroupMember, leaveGroup);

module.exports = router;