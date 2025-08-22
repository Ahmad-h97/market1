import User from '../models/User.js';

const checkSuspension = async (user) => {
  if (!user?.suspended?.isSuspended) {
    return { blocked: false };
  }

  const now = new Date();
  const expiresAt = user.suspended.suspensionExpiresAt
    ? new Date(user.suspended.suspensionExpiresAt)
    : null;

  if (expiresAt && now < expiresAt) {
    return {
      blocked: true,
      reason: user.suspended.reason || 'No reason provided',
      suspendedUntil: expiresAt,
    };
  }

  if (expiresAt && now >= expiresAt) {
    await User.findByIdAndUpdate(user.id, {
      $set: {
        'suspended.isSuspended': false,
        'suspended.reason': '',
        'suspended.suspendedAt': null,
        'suspended.suspensionExpiresAt': null,
      },
    });

    // Optional: return updated user status if needed
    return { blocked: false, suspensionExpired: true };
  }

  // Suspended with no expiration (manual unban needed)
  return { blocked: false };
};

export default checkSuspension;
