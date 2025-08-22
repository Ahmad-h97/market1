import User from '../models/User.js';
import House from '../models/House.js';
import Report from '../models/Report.js';






const markFav = async (req, res) => {
  const { houseId } = req.params;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    const house = await House.findById(houseId);

    if (!user || !house) return res.status(404).json({ error: "User or house not found" });

    // Prevent duplicates
    if (!user.favorites.includes(houseId)) {
      user.favorites.push(houseId);
      house.favCount += 1;

      await user.save();
      await house.save();
    }

    res.status(200).json({ message: "House marked as interested" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};


const removeFav = async (req, res) => {
  const { houseId } = req.params;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    const house = await House.findById(houseId);

    if (!user || !house) return res.status(404).json({ error: "User or house not found" });

    // Remove house from user's interested list
    user.favorites = user.favorites.filter(
      id => id.toString() !== houseId
    );

    // Decrease the interested count (but not below 0)
    if (house.favCount > 0) {
      house.favCount -= 1;
    }

    await user.save();
    await house.save();

    res.status(200).json({ message: "Interest removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const toggleFollow = async (req, res) => {
  const followerId = req.user.id;
  const followingId = req.params.id;

  if (followerId === followingId)
    return res.status(400).json({ error: "Can't follow yourself" });

  const follower = await User.findById(followerId);
  const following = await User.findById(followingId);

  if (!follower || !following)
    return res.status(404).json({ error: 'User not found' });

  const isFollowing = follower.following.includes(followingId);

  if (isFollowing) {
    // Unfollow
    follower.following.pull(followingId);
    following.followers.pull(followerId);
    await follower.save();
    await following.save();
    return res.json({ isFollowing: false });
  } else {
    // Follow
    follower.following.push(followingId);
    following.followers.push(followerId);
    await follower.save();
    await following.save();
    return res.json({ isFollowing: true });
  }
};

export const changeProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ultra = req.files?.profileImageUltra?.[0]?.path;
    const compressed = req.files?.profileImageCompressed?.[0]?.path;

    if (!ultra && !compressed) {
      return res.status(400).json({ message: 'No profile image uploaded' });
    }

    // Optional: delete old images from Cloudinary here

    user.profileImage = {
      ultra: ultra || user.profileImage?.ultra,
      compressed: compressed || user.profileImage?.compressed,
    };

    await user.save();

    res.json({
      message: 'Profile image updated successfully',
      profileImage: user.profileImage,
    });
  } catch (err) {
    console.error('Failed to change profile image:', err);
    res.status(500).json({ message: 'Server error while updating image' });
  }
};


export const flagDeleteAccount = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.flaggedForDeletion) {
      return res.status(400).json({ message: 'Account already flagged for deletion' });
    }

    const deleteAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Flag user for deletion
    user.flaggedForDeletion = true;
    user.deleteAt = deleteAt;
    await user.save();

    // Flag all houses posted by the user for deletion
    await House.updateMany(
      { postedBy: userId, flaggedForDeletion: false },
      {
        flaggedForDeletion: true,
        deleteAt: deleteAt,
      }
    );

    res.status(200).json({
      message: 'Account and all your houses flagged for deletion. They will be permanently deleted in 10 minutes.',
      deleteAt: deleteAt,
    });
  } catch (err) {
    console.error('Flag Delete Account Error:', err);
    res.status(500).json({ error: 'Failed to flag account and houses for deletion' });
  }
};

export const hideUser = async (req, res) => {
  try {
    
    const { id } = req.params;
    const { hide, reportId } = req.body;

    // 🔍 Validate report existence if reportId provided
    if (reportId) {
      const reportExists = await Report.exists({ _id: reportId });
      if (!reportExists) {
        return res.status(404).json({ message: 'Report not found' });
      }
    }

    // 🔄 Update hidden field of the user
    const user = await User.findByIdAndUpdate(
      id,
      { hidden: hide },
      { new: true, select: 'username hidden' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 📝 Log the action only when hiding (not unhide)
    if (reportId && hide) {
      try {
        await logActionToReport(
          reportId,
          'hide_user',
          req.user.id,
          `User "${user.username}" was hidden.`
        );
      } catch (logErr) {
        console.warn('Could not log action to report:', logErr.message);
      }
    }

    // ✅ Return updated user info
    res.json({
      message: `User is now ${hide ? 'hidden' : 'visible'}`,
      hidden: user.hidden,
    });

  } catch (err) {
    console.error('Error hiding user:', err);
    res.status(500).json({ message: 'Failed to update user visibility' });
  }
};




const fixedDurations = [5, 10, 30]; // days for suspensions 1, 2, 3
const maxSuspensions = 3;

export const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body; // optional suspension reason

    // Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.banned) {
      return res.status(400).json({ message: 'User is already banned' });
    }

    if (user.suspended.isSuspended) {
      return res.status(400).json({ message: 'User is already suspended' });
    }

    const newSuspensionCount = user.suspensionCount + 1;

    if (newSuspensionCount > maxSuspensions) {
      // Ban user
      user.banned = true;
      user.suspended = {
        isSuspended: false,
        reason: '',
        suspendedAt: null,
        suspensionExpiresAt: null,
      };
      await user.save();
      return res.status(200).json({ message: 'User banned after repeated suspensions', user });
    }

    // Calculate suspension expiry date using fixed durations
    const days = fixedDurations[user.suspensionCount] || fixedDurations[fixedDurations.length - 1];
    const suspensionExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    user.suspensionCount = newSuspensionCount;
    user.suspended = {
      isSuspended: true,
      reason: reason || '',
      suspendedAt: new Date(),
      suspensionExpiresAt,
    };

    await user.save();

    res.status(200).json({
      message: `User suspended for ${days} day(s)`,
      suspensionExpiresAt,
      user,
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ message: 'Failed to suspend user' });
  }
};




export {  markFav, removeFav,toggleFollow };