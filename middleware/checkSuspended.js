import User from '../models/User.js';

const checkSuspended = async (req, res, next) => {
  try {
    const user = req.user;
    console.log('[checkSuspended] User:', user?.id);

    if (!user?.suspended?.isSuspended) {
      console.log('[checkSuspended] User NOT suspended - allowing access');
      return next();
    }

    const now = new Date();
    const expiresAt = user.suspended.suspensionExpiresAt ? new Date(user.suspended.suspensionExpiresAt) : null;
    console.log(`[checkSuspended] Suspension info: isSuspended=${user.suspended.isSuspended}, expiresAt=${expiresAt}, now=${now}`);

    if (expiresAt && now < expiresAt) {
      console.log('[checkSuspended] Suspension active - blocking access');
      return res.status(403).json({
        error: 'Your account is suspended',
        suspendedUntil: expiresAt,
        reason: user.suspended.reason || 'No reason provided',
      });
    }

    if (expiresAt && now >= expiresAt) {
      console.log('[checkSuspended] Suspension expired - resetting suspension fields');
      await User.findByIdAndUpdate(user.id, {
        $set: {
          'suspended.isSuspended': false,
          'suspended.reason': '',
          'suspended.suspendedAt': null,
          'suspended.suspensionExpiresAt': null,
        },
      });

      // Update req.user accordingly
      req.user.suspended.isSuspended = false;
      req.user.suspended.reason = '';
      req.user.suspended.suspendedAt = null;
      req.user.suspended.suspensionExpiresAt = null;

      console.log('[checkSuspended] Suspension reset complete - allowing access');
      return next();
    }

    console.log('[checkSuspended] Suspended but no expiration date - allowing access');
    return next();
  } catch (err) {
    console.error('[checkSuspended] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default checkSuspended;
