import House from '../models/House.js';
import User from '../models/User.js';
import { 
  getPublicHouseDetails, 
  getPrivateHouseDetails 
} from '../dtos/houseDto.js';


const getAllHouses = async (req, res) => {
  try {
    
      // Get page and limit from query params, default to page=1, limit=10
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
      const maxLimit = 20;
      if (limit > maxLimit) limit = maxLimit;

     // Calculate how many documents to skip
    const skip = (page - 1) * limit;
    console.log(req.query)

    const { location, title, maxPrice, minPrice, timeAmount, timeUnit } = req.query;
    const categoriesQuery = req.query.interestedCategories;
    console.log(categoriesQuery)
    const match = {};

    if (categoriesQuery) {
  const categories = Array.isArray(categoriesQuery)
    ? categoriesQuery
    : categoriesQuery.split(',');
  match.category = { $in: categories };
}
    
    if (location) {
        match.location = { $regex: location, $options: 'i' }; // case-insensitive
      }
  
      if (title) {
        match.title = { $regex: title, $options: 'i' }; // case-insensitive
      }
  
      if (maxPrice || minPrice) {
        match.price = {};
        if (minPrice) match.price.$gte = Number(minPrice);
        if (maxPrice) match.price.$lte = Number(maxPrice);
      }


      if (timeAmount && timeUnit) {
  const now = new Date();
  const amount = parseInt(timeAmount, 10);
  const cutoff = new Date(now);

  switch (timeUnit) {
    case "minutes":
      cutoff.setMinutes(now.getMinutes() - amount);
      break;
    case "hours":
      cutoff.setHours(now.getHours() - amount);
      break;
    case "days":
      cutoff.setDate(now.getDate() - amount);
      break;
    case "weeks":
      cutoff.setDate(now.getDate() - amount * 7);
      break;
    case "months":
      cutoff.setMonth(now.getMonth() - amount);
      break;
    case "years":
      cutoff.setFullYear(now.getFullYear() - amount);
      break;
    default:
      break;
  }
 match.createdAt = { $gte: cutoff };
}

 
  
      let userCity = null;
      
   if (req.user?.id) {
  const user = await User.findById(req.user.id).select('city');
  userCity = user?.city || null;
}
   
       if (location) {
      userCity = null;
    }
// 5. Build aggregation pipeline
    const pipeline = [
      { $match: match },
    ];

    if (userCity) {
      // 6. If user didn't filter by location, boost home city houses
      pipeline.push(
        {
          $addFields: {
            iscity: {
              $cond: [{ $eq: ["$location", userCity] }, 1, 0]
            }
          }
        },
        {
          $sort: { iscity: -1, createdAt: -1 }
        }
      );
    } else {
      // 7. Just sort by newest
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // 8. Add pagination
    pipeline.push({ $skip: skip }, { $limit: limit });

    // 9. Run aggregation
    let houses = await House.aggregate(pipeline);

    // 10. Count total (without skip/limit)
    const total = await House.countDocuments(match);

    // 11. Populate postedBy (after aggregation)
    houses = await House.populate(houses, {
      path: 'postedBy',
      select: 'username email profileImage'
    });

        let followingSet = new Set();

if (req.user?.id) {
  const currentUser = await User.findById(req.user.id).select('following');
  followingSet = new Set(currentUser.following.map(id => id.toString()));
}


    // 12. Choose what fields to return
    const mapper = res.locals.showFullDetails
      ? getPrivateHouseDetails
      : getPublicHouseDetails;


  
const data = houses.map((house) => {
     const postedById = house.postedBy?._id?.toString();
  const isFollowing = followingSet.has(postedById);

  return res.locals.showFullDetails
    ? getPrivateHouseDetails(house, isFollowing)
    : getPublicHouseDetails(house);
});

    // 13. Send response
    res.status(200).json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error('Get Houses Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getMyHouses =async (req, res) => {
  try {
    const userId = req.user.id;

    
      // Get page and limit from query params, default to page=1, limit=10
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
      const maxLimit = 20;
      if (limit > maxLimit) limit = maxLimit;

     // Calculate how many documents to skip
    const skip = (page - 1) * limit;


    const { location, title, maxPrice, minPrice, date } = req.query;

    const filter = {postedBy: userId};

    
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

      

    const [houses, total] = await Promise.all([
       House.find(filter)
       .populate('postedBy', 'username email')
       .sort({createdAt:-1})
       .skip(skip)
       .limit(limit),
      House.countDocuments(filter)
    ]);
    
    const mapper = res.locals.showFullDetails ? getPrivateHouseDetails : getPublicHouseDetails;

    res.status(200).json({
      data:houses.map(mapper),
      page,
      limit,
      total,
      totalpages:Math.ceil(total/limit)
    });

  } catch (err) {
    console.error('Get Houses Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}


const getUserHouses =async (req, res) => {
  try {
    const userId =  req.params.userId;;

    
      // Get page and limit from query params, default to page=1, limit=10
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
      const maxLimit = 20;
      if (limit > maxLimit) limit = maxLimit;

     // Calculate how many documents to skip
    const skip = (page - 1) * limit;


    const { location, title, maxPrice, minPrice, date } = req.query;

    const filter = {postedBy: userId};

    
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

      

    const [houses, total] = await Promise.all([
       House.find(filter)
       .populate('postedBy', 'username email')
       .sort({createdAt:-1})
       .skip(skip)
       .limit(limit),
      House.countDocuments(filter)
    ]);
    
    const mapper = res.locals.showFullDetails ? getPrivateHouseDetails : getPublicHouseDetails;

    res.status(200).json({
      data:houses.map(mapper),
      page,
      limit,
      total,
      totalpages:Math.ceil(total/limit)
    });

  } catch (err) {
    console.error('Get Houses Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
  
}

const getHouseDetails = async (req, res) => {
  try {
console.log(req.params.houseId)
    const house = await House.findById(req.params.houseId)
    
      .populate('postedBy', 'username email')
      .populate('reviews.user', 'username email');
    console.log(house);
    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }

     const houseData = req.user 
      ? getPrivateHouseDetails(house) 
      : getPublicHouseDetails(house);

    res.json(houseData);
  } catch (err) {
    console.error('Error fetching house:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const postHouse = async (req, res) => {
  

  const { title,description, location, price, category } = req.body;

  if (req.files.length > 3) {
    return res.status(400).json({ error: 'Maximum of 3 images allowed.' });
  }

  const imageUrls = req.files.map(file => file.path);

  //const imageUrl = req.file ? req.file.path : null;

  try {

     // 2. Get user ID from token (set in verifyJWT middleware)
    const userId = req.user.id;

console.log(userId)
    // 1. Find the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const categories= [
  "real estate",
  "electronics",
  "phones & PC",
  "clothes",
  "services",
  "vehicles"
];
    
 if (!categories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // 2. Create new house
    const newHouse = new House({
      title,
      description,
      location,
      price,
      category,
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

const editHouse = async (req, res) => {
  console.log("req start ....." ,req.body,req.files,"req end ")
  const { houseId } = req.params;
  const { title, description, location,category, price = [] } = req.body;
  const existingUrls = JSON.parse(req.body.existingUrls);
  const imagesToRemove =0;
  console.log(existingUrls)
  try {
    const userId = req.user.id;

    const house = await House.findById(houseId);
    if (!house) 
      return res.status(404).json({ error: `House with ID ${houseId} not found` });
console.log( house.images)
    if (house.postedBy.toString() !== userId.toString()) 
      return res.status(403).json ("User does not own this house");
   
    
    // 2. Calculate image changes
    const currentImages = existingUrls.length;
    
    const newImagesToAdd = req.files?.length || 0;
    const finalImageCount = currentImages - imagesToRemove + newImagesToAdd;
console.log('123')
    // 3. Validate image count
    if (finalImageCount > 3) {
      return res.status(400).json({
        error: `Maximum 3 images allowed. Current: ${currentImages}, Trying to add: ${newImagesToAdd}, Remove: ${imagesToRemove}`,
        maxAllowed: 3,
        currentCount: currentImages,
        wouldBeCount: finalImageCount
      });
    }
console.log('123')
    
    // 4. Process image removal (database only)
    console.log(existingUrls)
      house.images = house.images.filter(imgUrl => existingUrls.includes(imgUrl));
   

    
    // 5. Add new images (if any)
    if (req.files?.length) {
      const newImageUrls = req.files.map(file => file.path);
      house.images.push(...newImageUrls);
    }
  

    
    // 6. Enforce maximum limit (final safeguard)
    house.images = house.images.slice(0, 3);


    // Update fields
    if (title) house.title = title;
    if (description) house.description = description;
    if (location) house.location = location;
    if (category) house.category = category;
    if (price) house.price = price;

    await house.save();
    res.status(200).json({ message: 'House updated', house });

  } catch (err) {
    console.error('Edit House Error:', err);
    res.status(500).json({ 
      error: 'Failed to update house',
    details: err.message });
  }
};

const deleteHouse = async (req, res) => {
  const { houseId } = req.params;

  try {

     const userId = req.user.id;

    const house = await House.findById(houseId);
    if (!house) 
      return res.status(404).json({ error: `House with ID ${houseId} not found` });

    if (house.postedBy.toString() !== userId.toString()) 
      return res.status(403).json ("User does not own this house");
   
    // Optional: Delete images from Cloudinary if stored there
    // for (let imageUrl of house.images) {
    //   const publicId = extractPublicId(imageUrl); // You need to implement this
    //   await cloudinary.uploader.destroy(publicId);
    // }

  await house.deleteOne();
    res.status(200).json({ message: 'House deleted successfully' });
  } catch (err) {
    console.error('Delete House Error:', err);
    res.status(500).json({ error: 'Failed to delete house', details: err.message });
  }
};

const upsertReview = async (req, res) => {
  const { houseId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  try {
    const house = await House.findById(houseId);
    if (!house)
      return res.status(404).json({ error: `House with ID ${houseId} not found` });

    if (house.postedBy.toString() === userId)
      return res.status(403).json({ error: 'You cannot review your own house' });

    // Try to update existing review
    const result = await House.updateOne(
      { _id: houseId, "reviews.user": userId },
      { $set: { "reviews.$": { user: userId, rating, comment, date: new Date() } } }
    );

    if (result.matchedCount  === 0) {
      // Add new review
      await House.updateOne(
        { _id: houseId },
        { $push: { reviews: { user: userId, rating, comment, date: new Date() } } }
      );
    }

    // Recalculate average rating
    const updatedHouse = await House.findById(houseId);
    const total = updatedHouse.reviews.reduce((sum, r) => sum + r.rating, 0);
    updatedHouse.averageRating = total / updatedHouse.reviews.length;
    await updatedHouse.save();

    res.status(200).json({ message: 'Review processed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process review' });
  }
};
const deleteReview = async (req, res) => {
  const { houseId } = req.params;

  try {
    // Step 1: Check if house exists
    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }

    const userId = req.user.id;

    // Step 2: Check if the user has a review on this house
    const reviewExists = house.reviews.some(
      (review) => review.user.toString() === userId
    );

    if (!reviewExists) {
      return res.status(404).json({ error: 'Review not found or not yours to delete' });
    }

    // Step 3: Remove the review using $pull
    const result = await House.updateOne(
      { _id: houseId },
      { $pull: { reviews: { user: userId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: 'Failed to delete review' });
    }

    // Step 4: Respond success
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Delete Review Error:', err);
    res.status(500).json({ error: 'Server error while deleting review' });
  }
};

export { getAllHouses,getMyHouses,getUserHouses, getHouseDetails,postHouse, editHouse ,deleteHouse , deleteReview, upsertReview };


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
