import User from '../models/User.js';
import House from '../models/House.js';




const postHouse = async (req, res) => {
  const { title,description, location, price, userId } = req.body;

  if (req.files.length > 3) {
    return res.status(400).json({ error: 'Maximum of 3 images allowed.' });
  }

  const imageUrls = req.files.map(file => file.path);

  //const imageUrl = req.file ? req.file.path : null;

  try {

    // 1. Find the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2. Create new house
    const newHouse = new House({
      title,
      description,
      location,
      price,
      images: imageUrls,
      postedBy: user._id
    });

    await newHouse.save();

    // 3. Optional: Add to user's postedHouses array
    user.postedHouses.push(newHouse._id);
    await user.save();

    res.status(201).json({ message: 'House posted', house: newHouse });
  } catch (err) {
    console.error('Post House Error:', err);
    res.status(500).json({ error: err.message });
  }
};


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


export {  postHouse ,markFav, removeFav };