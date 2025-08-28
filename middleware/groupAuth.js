const GroupMember = require('../modals/GroupMember');

// Check if user is group leader
const isGroupLeader = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const isLeader = await GroupMember.isLeader(groupId, userId);
    
    if (!isLeader) {
      return res.status(403).json({ message: 'Access denied. Group leader privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Group leader check error:', error);
    res.status(500).json({ message: 'Server error during authorization check' });
  }
};

// Check if user is approved group member
const isGroupMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const isMember = await GroupMember.isApprovedMember(groupId, userId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied. Group membership required.' });
    }

    next();
  } catch (error) {
    console.error('Group member check error:', error);
    res.status(500).json({ message: 'Server error during authorization check' });
  }
};

module.exports = { isGroupLeader, isGroupMember };