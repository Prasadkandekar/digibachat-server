const Group = require('../modals/Group');
const GroupMember = require('../modals/GroupMember');
const JoinRequest = require('../modals/JoinRequest');
const Financial = require('../modals/Financial');

// Create a new group
const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const created_by = req.user.id;

    // Create group
    const group = await Group.create({ name, description, created_by });

    // Add creator as leader
    await GroupMember.add({
      group_id: group.id,
      user_id: created_by,
      role: 'leader',
      status: 'approved'
    });

    res.status(201).json({
      message: 'Group created successfully',
      group,
      group_code: group.group_code
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error during group creation' });
  }
};

// Get group details
const getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is member
    const isMember = await GroupMember.isApprovedMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. Group membership required.' });
    }

    // Get group members
    const members = await GroupMember.findByGroupId(groupId, 'approved');

    res.json({
      group,
      members
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error while fetching group details' });
  }
};

// Join group using code
const joinGroup = async (req, res) => {
  try {
    const { groupCode } = req.params;
    const userId = req.user.id;

    // Find group by code
    const group = await Group.findByCode(groupCode);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is already a member
    const existingMember = await GroupMember.findByGroupAndUser(group.id, userId);
    if (existingMember) {
      return res.status(400).json({ 
        message: `You are already ${existingMember.status === 'pending' ? 'waiting for approval' : 'a member'} of this group` 
      });
    }

    // Check if user has pending request
    const hasPendingRequest = await JoinRequest.hasPendingRequest(group.id, userId);
    if (hasPendingRequest) {
      return res.status(400).json({ message: 'You already have a pending request to join this group' });
    }

    // Create join request
    await JoinRequest.create({
      group_id: group.id,
      user_id: userId
    });

    // Add as pending member
    await GroupMember.add({
      group_id: group.id,
      user_id: userId,
      status: 'pending'
    });

    res.json({ 
      message: 'Join request submitted successfully. Waiting for group leader approval.',
      group: { id: group.id, name: group.name }
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ message: 'Server error while joining group' });
  }
};

// Get pending join requests
const getJoinRequests = async (req, res) => {
  try {
    const { groupId } = req.params;

    const requests = await JoinRequest.findByGroupId(groupId, 'pending');
    
    res.json({ requests });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ message: 'Server error while fetching join requests' });
  }
};

// Approve join request
const approveJoinRequest = async (req, res) => {
  try {
    const { groupId, requestId } = req.params;
    const reviewed_by = req.user.id;

    // Get request details
    const request = await JoinRequest.findById(requestId);
    if (!request || request.group_id != groupId) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    // Update request status
    await JoinRequest.updateStatus(requestId, 'approved', reviewed_by);

    // Update member status
    await GroupMember.updateStatus(groupId, request.user_id, 'approved');

    res.json({ message: 'Join request approved successfully' });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({ message: 'Server error while approving join request' });
  }
};

// Reject join request
const rejectJoinRequest = async (req, res) => {
  try {
    const { groupId, requestId } = req.params;
    const reviewed_by = req.user.id;

    // Get request details
    const request = await JoinRequest.findById(requestId);
    if (!request || request.group_id != groupId) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    // Update request status
    await JoinRequest.updateStatus(requestId, 'rejected', reviewed_by);

    // Remove member
    await GroupMember.remove(groupId, request.user_id);

    res.json({ message: 'Join request rejected successfully' });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ message: 'Server error while rejecting join request' });
  }
};

// Remove member from group
const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const leaderId = req.user.id;

    // Check if user is trying to remove themselves
    if (userId == leaderId) {
      return res.status(400).json({ message: 'Leaders cannot remove themselves. Transfer leadership first.' });
    }

    // Check if member has active loans or savings
    const hasLoans = await Financial.hasActiveLoans(groupId, userId);
    const hasSavings = await Financial.hasSavings(groupId, userId);

    if (hasLoans || hasSavings) {
      return res.status(400).json({ 
        message: 'Cannot remove member with active financial activities. Clear loans/savings first.' 
      });
    }

    // Remove member
    await GroupMember.remove(groupId, userId);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error while removing member' });
  }
};

// Leave group
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is the leader
    const isLeader = await GroupMember.isLeader(groupId, userId);
    if (isLeader) {
      return res.status(400).json({ 
        message: 'Group leaders cannot leave the group. Transfer leadership first or delete the group.' 
      });
    }

    // Check if member has active loans or savings
    const hasLoans = await Financial.hasActiveLoans(groupId, userId);
    const hasSavings = await Financial.hasSavings(groupId, userId);

    if (hasLoans || hasSavings) {
      return res.status(400).json({ 
        message: 'Cannot leave group with active financial activities. Clear loans/savings first.' 
      });
    }

    // Remove member
    await GroupMember.remove(groupId, userId);

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ message: 'Server error while leaving group' });
  }
};

// Get user's groups
const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.findByUserId(userId);
    
    res.json({ groups });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ message: 'Server error while fetching user groups' });
  }
};

module.exports = {
  createGroup,
  getGroup,
  joinGroup,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  removeMember,
  leaveGroup,
  getUserGroups
};