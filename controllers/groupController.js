const Group = require('../modals/Group');
const GroupMember = require('../modals/GroupMember');
const JoinRequest = require('../modals/JoinRequest');

// Create a new group
const createGroup = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      savings_frequency, 
      savings_amount, 
      interest_rate, 
      default_loan_duration 
    } = req.body;
    const created_by = req.user.id;

    if (!name || !description || !savings_frequency || !savings_amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Group name, description, savings frequency, and savings amount are required' 
      });
    }

    // Set default values if not provided
    const groupData = {
      name,
      description,
      created_by,
      savings_frequency,
      savings_amount: parseFloat(savings_amount),
      interest_rate: interest_rate ? parseFloat(interest_rate) : 0,
      default_loan_duration: default_loan_duration ? parseInt(default_loan_duration) : 30
    };

    console.log('Creating group with data:', groupData);
    const group = await Group.create(groupData);

    // Add creator as leader
    await GroupMember.add({
      group_id: group.id,
      user_id: created_by,
      role: 'leader',
      status: 'approved'
    });

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: {
        group,
        group_code: group.group_code,
        shareable_link: `${process.env.FRONTEND_URL}/join/${group.group_code}`
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during group creation',
      error: error.message
    });
  }
};

// Get group details
const getGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Check if user is member
    const isMember = await GroupMember.isApprovedMember(groupId, req.user.id);
    if (!isMember) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Group membership required.' 
      });
    }

    // Get group members
    const members = await GroupMember.findByGroupId(groupId);

    res.json({
      success: true,
      data: {
        group,
        members
      }
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching group details' 
    });
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
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Check if user is already a member
    const existingMember = await GroupMember.findByGroupAndUser(group.id, userId);
    if (existingMember) {
      return res.status(400).json({ 
        success: false,
        message: `You are already ${existingMember.status === 'pending' ? 'waiting for approval' : 'a member'} of this group` 
      });
    }

    // Check if user has pending request
    const hasPendingRequest = await JoinRequest.hasPendingRequest(group.id, userId);
    if (hasPendingRequest) {
      return res.status(400).json({ 
        success: false,
        message: 'You already have a pending request to join this group' 
      });
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
      success: true,
      message: 'Join request submitted successfully. Waiting for group leader approval.',
      data: { 
        group: { id: group.id, name: group.name },
        requires_approval: true
      }
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while joining group' 
    });
  }
};

// Get join requests for a group
const getJoinRequests = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    console.log(`Getting join requests for group ${groupId}, user ${userId}`);

    // Check if user is group leader
    const isLeader = await GroupMember.isLeader(groupId, userId);
    console.log(`Is user ${userId} leader of group ${groupId}?`, isLeader);
    
    if (!isLeader) {
      console.log(`User ${userId} is not a leader of group ${groupId}`);
      return res.status(403).json({ 
        success: false,
        message: 'Only group leaders can view join requests' 
      });
    }

    const requests = await JoinRequest.findByGroupId(groupId, 'pending');
    console.log(`Found ${requests.length} pending requests for group ${groupId}:`, requests);
    
    res.json({ 
      success: true,
      data: { requests } 
    });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching join requests' 
    });
  }
};

// Approve join request
const approveJoinRequest = async (req, res) => {
  try {
    const { groupId, requestId } = req.params;
    const reviewed_by = req.user.id;

    // Check if user is group leader
    const isLeader = await GroupMember.isLeader(groupId, reviewed_by);
    if (!isLeader) {
      return res.status(403).json({ 
        success: false,
        message: 'Only group leaders can approve join requests' 
      });
    }

    // Get request details
    const request = await JoinRequest.findById(requestId);
    if (!request || request.group_id != groupId) {
      return res.status(404).json({ 
        success: false,
        message: 'Join request not found' 
      });
    }

    // Update request status
    await JoinRequest.updateStatus(requestId, 'approved', reviewed_by);

    // Update member status
    await GroupMember.updateStatus(groupId, request.user_id, 'approved');

    res.json({ 
      success: true,
      message: 'Join request approved successfully' 
    });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while approving join request' 
    });
  }
};

// Reject join request
const rejectJoinRequest = async (req, res) => {
  try {
    const { groupId, requestId } = req.params;
    const reviewed_by = req.user.id;

    // Check if user is group leader
    const isLeader = await GroupMember.isLeader(groupId, reviewed_by);
    if (!isLeader) {
      return res.status(403).json({ 
        success: false,
        message: 'Only group leaders can reject join requests' 
      });
    }

    // Get request details
    const request = await JoinRequest.findById(requestId);
    if (!request || request.group_id != groupId) {
      return res.status(404).json({ 
        success: false,
        message: 'Join request not found' 
      });
    }

    // Update request status
    await JoinRequest.updateStatus(requestId, 'rejected', reviewed_by);

    // Remove member
    await GroupMember.remove(groupId, request.user_id);

    res.json({ 
      success: true,
      message: 'Join request rejected successfully' 
    });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while rejecting join request' 
    });
  }
};

// Get user's groups (all groups where user is a member)
const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.findByUserId(userId);
    
    res.json({ 
      success: true,
      data: { groups } 
    });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching user groups' 
    });
  }
};

// Get groups where user is a leader (for managing join requests)
const getLeaderGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.findByUserIdAndRole(userId, 'leader');
    
    res.json({ 
      success: true,
      data: { groups } 
    });
  } catch (error) {
    console.error('Get leader groups error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching leader groups' 
    });
  }
};

// Get group by code (for shareable link)
const getGroupByCode = async (req, res) => {
  try {
    const { groupCode } = req.params;

    const group = await Group.findByCode(groupCode);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Basic group info for public viewing
    const publicInfo = {
      id: group.id,
      name: group.name,
      description: group.description,
      group_code: group.group_code,
      created_at: group.created_at,
      leader_name: group.leader_name
    };

    res.json({
      success: true,
      data: { group: publicInfo }
    });
  } catch (error) {
    console.error('Get group by code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching group' 
    });
  }
};

// Debug endpoint to check join requests
const debugJoinRequests = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    console.log(`Debug: Checking join requests for group ${groupId}, user ${userId}`);

    // Check if user is group leader
    const isLeader = await GroupMember.isLeader(groupId, userId);
    console.log(`Debug: Is user ${userId} leader of group ${groupId}?`, isLeader);

    // Get all join requests for this group (not just pending)
    const allRequests = await JoinRequest.findByGroupId(groupId);
    console.log(`Debug: All requests for group ${groupId}:`, allRequests);

    // Get pending requests
    const pendingRequests = await JoinRequest.findByGroupId(groupId, 'pending');
    console.log(`Debug: Pending requests for group ${groupId}:`, pendingRequests);

    // Get group members to see who is in the group
    const groupMembers = await GroupMember.findByGroupId(groupId);
    console.log(`Debug: Group members for group ${groupId}:`, groupMembers);

    res.json({
      success: true,
      debug: {
        groupId,
        userId,
        isLeader,
        allRequests,
        pendingRequests,
        groupMembers
      }
    });
  } catch (error) {
    console.error('Debug join requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
};

// Temporary endpoint to bypass leader check for debugging
const debugJoinRequestsNoAuth = async (req, res) => {
  try {
    const { groupId } = req.params;

    console.log(`Debug (no auth): Checking join requests for group ${groupId}`);

    // Get all join requests for this group (not just pending)
    const allRequests = await JoinRequest.findByGroupId(groupId);
    console.log(`Debug (no auth): All requests for group ${groupId}:`, allRequests);

    // Get pending requests
    const pendingRequests = await JoinRequest.findByGroupId(groupId, 'pending');
    console.log(`Debug (no auth): Pending requests for group ${groupId}:`, pendingRequests);

    res.json({
      success: true,
      debug: {
        groupId,
        allRequests,
        pendingRequests
      }
    });
  } catch (error) {
    console.error('Debug join requests (no auth) error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
};

// Get group members
const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is member of the group
    const isMember = await GroupMember.isApprovedMember(groupId, userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Group membership required.'
      });
    }

    // Get group members
    const members = await GroupMember.findByGroupId(groupId);
    
    res.json({
      success: true,
      data: { members }
    });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching group members'
    });
  }
};

module.exports = {
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
};
