import User from '../models/User.js';
import House from '../models/House.js';







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


export {  markFav, removeFav,toggleFollow };