import User from '../models/User.js';
import House from '../models/House.js';







const markFav = async (req, res) => {
  const { userId, houseId } = req.params;

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
  const { userId, houseId } = req.params;

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


export {  markFav, removeFav };