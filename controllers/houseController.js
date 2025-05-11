import House from '../models/House.js';

const getAllHouses = async (req, res) => {
  try {

    const { location, title, maxPrice, minPrice, date } = req.query;

    const filter = {};

    
    if (location) {
        filter.location = { $regex: location, $options: 'i' }; // case-insensitive
      }
  
      if (title) {
        filter.title = { $regex: title, $options: 'i' }; // case-insensitive
      }
  
      if (maxPrice || minPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
      }
  
      if (date) {
        const parsedDate = new Date(date);
        filter.createdAt = { $gte: parsedDate };
      }

      


    const houses = await House.find(filter).populate('postedBy', 'username email');
    res.status(200).json(houses);
  } catch (err) {
    console.error('Get Houses Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getHouseDetails = async (req, res) => {
  try {
    const house = await House.findById(req.params.id)
      .populate('postedBy', 'username email')
      .populate('reviews.user', 'username email');

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }

    res.json(house);
  } catch (err) {
    console.error('Error fetching house:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const editHouse = async (req, res) => {
  const { houseId } = req.params;
  const { title, description, location, price, removeImages = [] } = req.body;

  try {
    const house = await House.findById(houseId);
    if (!house) return res.status(404).json({ error: `House with ID ${houseId} not found` });

    // Remove images
    if (removeImages.length) {
      house.images = house.images.filter(imgUrl => !removeImages.includes(imgUrl));
      // Optional: Delete from Cloudinary here
    }

    // Add new images
    const newImageUrls = req.files.map(file => file.path);
    house.images.push(...newImageUrls);

    // Max 3 images
    house.images = house.images.slice(0, 3);

    // Update fields
    if (title) house.title = title;
    if (description) house.description = description;
    if (location) house.location = location;
    if (price) house.price = price;

    await house.save();
    res.status(200).json({ message: 'House updated', house });

  } catch (err) {
    console.error('Edit House Error:', err);
    res.status(500).json({ error: 'Failed to update house' });
  }
};

const deleteHouse = async (req, res) => {
  const { houseId } = req.params;

  try {
    const house = await House.findById(houseId);
    if (!house) return res.status(404).json({ error: `House with ID ${houseId} not found` });

    // Optional: Delete images from Cloudinary if stored there
    // for (let imageUrl of house.images) {
    //   const publicId = extractPublicId(imageUrl); // You need to implement this
    //   await cloudinary.uploader.destroy(publicId);
    // }

    await House.findByIdAndDelete(houseId);
    res.status(200).json({ message: 'House deleted successfully' });
  } catch (err) {
    console.error('Delete House Error:', err);
    res.status(500).json({ error: 'Failed to delete house' });
  }
};




const upsertReview = async (req, res) => {
  const { houseId, userId } = req.params;
  const { rating, comment } = req.body;

  try {
    const result = await House.updateOne(
      {
        _id: houseId,
        "reviews.user": userId
      },
      {
        $set: {
          "reviews.$": { user: userId, rating, comment } // Updates existing
        }
      },
      { upsert: false }
    );

    if (result.modifiedCount === 0) {
      // No existing review found - add new one
      const addResult = await House.updateOne(
        { _id: houseId },
        { $push: { reviews: { user: userId, rating, comment } } }
      );
      
      if (addResult.modifiedCount === 0) {
        return res.status(404).json({ error: 'House not found' });
      }
    }

    res.status(200).json({ message: 'Review processed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process review' });
  }
};


const deleteReview = async (req, res) => {
  const { houseId, userId } = req.params;

  try {
    const house = await House.findById(houseId);
    if (!house) return res.status(404).json({ error: 'House not found' });

    const result = await House.updateOne(
      { _id: houseId },
      { $pull: { reviews: {  user: userId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Review not found or not yours to delete' });
    }

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Delete Review Error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

export { getAllHouses, getHouseDetails, editHouse ,deleteHouse , deleteReview, upsertReview };


/*
const addReview = async (req, res) => {
  const { houseId, userId } = req.params;
  const { rating, comment } = req.body;
 

  try {
    const house = await House.findById(houseId);
    if (!house) return res.status(404).json({ error: 'House not found' });

    const alreadyReviewed = house.reviews.find(
      (rev) => rev.user.toString() === userId
    );
    if (alreadyReviewed) {
      return res.status(400).json({ error: 'You already reviewed this house' });
    }

    house.reviews.push({ user: userId, comment, rating });
    await house.save();

    res.status(201).json({ message: 'Review added' });
  } catch (err) {
    console.error('Add Review Error:', err);
    res.status(500).json({ error: 'Failed to add review' });
  }
};
*/
