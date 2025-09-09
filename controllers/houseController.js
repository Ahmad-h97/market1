import House from '../models/House.js';
import User from '../models/User.js';
import { 
  getPublicHouseDetails, 
  getPrivateHouseDetails 
} from '../dtos/houseDto.js';
import { logActionToReport } from '../utils/reportActions.js'; // adjust path as needed
import Report from '../models/Report.js';
import { addEditRecord } from '../utils/editHistoryUtils.js';
import mongoose from 'mongoose';
import { getSocketServer } from '../socket.js'; // <- new, for emitting events

const getAllHouses = async (req, res) => {
  try {
    console.time('Total getAllHouses'); 

    console.log('🔍 Query cursor:', req.query.cursor);  

    console.time('Parse query params');
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const cursor = req.query.cursor;
    const page = parseInt(req.query.page, 10);
    const {
      location,
      search,
      maxPrice,
      minPrice,
      timeAmount,
      timeUnit,
    } = req.query;
    const categoriesQuery = req.query.interestedCategories;
    console.timeEnd('Parse query params');

    const match = { flaggedForDeletion: { $ne: true } };

    if (categoriesQuery) {
      console.time('Build categories filter');
      const categories = Array.isArray(categoriesQuery)
        ? categoriesQuery
        : categoriesQuery.split(',');
      match.category = { $in: categories };
      console.timeEnd('Build categories filter');
    }

    if (location) {
      match.location = { $regex: location, $options: 'i' };
    }

    if (search) {
      match.$text = { $search: search };
    }

    if (maxPrice || minPrice) {
      match.price = {};
      if (minPrice) match.price.$gte = Number(minPrice);
      if (maxPrice) match.price.$lte = Number(maxPrice);
    }

    if (timeAmount && timeUnit) {
      console.time('Build time filter');
      const now = new Date();
      const amount = parseInt(timeAmount, 10);
      const cutoff = new Date(now);
      switch (timeUnit) {
        case "minutes": cutoff.setMinutes(now.getMinutes() - amount); break;
        case "hours": cutoff.setHours(now.getHours() - amount); break;
        case "days": cutoff.setDate(now.getDate() - amount); break;
        case "weeks": cutoff.setDate(now.getDate() - amount * 7); break;
        case "months": cutoff.setMonth(now.getMonth() - amount); break;
        case "years": cutoff.setFullYear(now.getFullYear() - amount); break;
      }
      match.createdAt = { $gte: cutoff };
      console.timeEnd('Build time filter');
    }

    if (!cursor && page && page > 1) {
      console.time('Convert page to cursor');
      const offset = (page - 1) * limit;
      const sortedMatch = await House.find(match)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(1)
        .select('_id');
      if (sortedMatch.length > 0) {
        match._id = { $lt: sortedMatch[0]._id };
      }
      console.timeEnd('Convert page to cursor');
    }

    if (cursor) {
      console.time('Parse cursor');
      const [cursorCreatedAtStr, cursorIdStr] = cursor.split('|');
      const cursorCreatedAt = new Date(cursorCreatedAtStr);
      if (!isNaN(cursorCreatedAt.getTime())) {
        const cursorId = new mongoose.Types.ObjectId(cursorIdStr);
        match.$or = [
          { createdAt: { $lt: cursorCreatedAt } },
          { createdAt: cursorCreatedAt, _id: { $lt: cursorId } }
        ];
      }
      console.timeEnd('Parse cursor');
    }

    console.time('Fetch user role');
    const userRole = req.user?.role || 'user';
    const isModeratorOrAdmin = ['admin', 'moderator'].includes(userRole);
    console.timeEnd('Fetch user role');

    let userCity = null;
    if (req.user?.id) {
      console.time('Fetch user city');
      const user = await User.findById(req.user.id).select('city');
      userCity = user?.city || null;
      console.timeEnd('Fetch user city');
    }
    if (location) userCity = null;

    console.time('Build pipeline');
    const pipeline = [{ $match: match }];
    if (search) {
      pipeline.push(
        { $addFields: { score: { $meta: "textScore" } } },
        { $sort: { score: -1, createdAt: -1 } }
      );
    } else if (userCity) {
      pipeline.push(
        { $addFields: { iscity: { $cond: [{ $eq: ["$location", userCity] }, 1, 0] } } },
        { $sort: { iscity: -1, createdAt: -1 } }
      );
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'postedBy'
        }
      },
      { $unwind: '$postedBy' }
    );
    if (!isModeratorOrAdmin) {
      pipeline.push({
        $match: {
          'postedBy.hidden': false,
          'postedBy.banned': { $ne: true },
          hidden: { $ne: true }
        }
      });
    }
    pipeline.push({ $limit: limit });
    console.timeEnd('Build pipeline');

    console.time('Aggregate houses');
    let houses = await House.aggregate(pipeline);
    console.timeEnd('Aggregate houses');

    console.time('Populate postedBy');
    houses = await House.populate(houses, {
      path: 'postedBy',
      select: 'username email profileImage hidden banned'
    });
    console.timeEnd('Populate postedBy');

    if (req.user?.id && houses.length > 0) {
      console.time('Update seen posts and views');
      const houseIds = houses.map(h => h._id.toString());
      const user = await User.findById(req.user.id).select('seenPosts');
      const seenSet = new Set(user.seenPosts.map(sp => sp.house.toString()));
      const newlySeenIds = houseIds.filter(id => !seenSet.has(id));
      if (newlySeenIds.length > 0) {
        await User.updateOne(
          { _id: req.user.id },
          { $push: { seenPosts: { $each: newlySeenIds.map(id => ({ house: id, seenAt: new Date() })) } } }
        );
        await House.updateMany(
          { _id: { $in: newlySeenIds } },
          { $inc: { viewCount: 1 }, $set: { lastInteractionAt: new Date() } }
        );
      }
      console.timeEnd('Update seen posts and views');
    }

    console.time('Handle absoluteLatest');
    let absoluteLatest = null;
    if (req.query.absoluteLatest) {
      try {
        absoluteLatest = JSON.parse(req.query.absoluteLatest);
        absoluteLatest.createdAt = new Date(absoluteLatest.createdAt);
        absoluteLatest._id = new mongoose.Types.ObjectId(absoluteLatest._id);
      } catch (err) {
        absoluteLatest = null;
      }
    }
    if (!absoluteLatest) {
      if (page === 1 && houses.length > 0) {
        absoluteLatest = houses[0];
      } else {
        absoluteLatest = await House.findOne({ flaggedForDeletion: { $ne: true } })
          .sort({ createdAt: -1, _id: -1 })
          .select('_id createdAt title location');
      }
    }
    console.timeEnd('Handle absoluteLatest');

    console.time('Find newer posts');
    let newPosts = [];
    let firstNew = null;
    let lastNew = null;
    let evenNewerPosts = [];

    const newerThanAbsoluteQuery = {
      $or: [
        { createdAt: { $gt: absoluteLatest.createdAt } },
        { createdAt: absoluteLatest.createdAt, _id: { $gt: absoluteLatest._id } }
      ],
      flaggedForDeletion: { $ne: true }
    };
    if (userCity && !location) {
      newerThanAbsoluteQuery.location = userCity;
    }

    evenNewerPosts = await House.find(newerThanAbsoluteQuery)
      .sort({ createdAt: 1 })
      .limit(3);
    evenNewerPosts = await House.populate(evenNewerPosts, {
      path: 'postedBy',
      select: 'username email profileImage hidden banned'
    });
    if (evenNewerPosts.length > 0) {
      newPosts = evenNewerPosts;
      firstNew = newPosts[0]._id.toString();
      lastNew = newPosts[newPosts.length - 1]._id.toString();
      absoluteLatest = newPosts[newPosts.length - 1];
    }
    console.timeEnd('Find newer posts');

    console.time('Fetch following list');
    let followingSet = new Set();
    if (req.user?.id) {
      const currentUser = await User.findById(req.user.id).select('following');
      followingSet = new Set(currentUser.following.map(id => id.toString()));
    }
    console.timeEnd('Fetch following list');

    console.time('Map houses for response');
    const mapper = res.locals.showFullDetails ? getPrivateHouseDetails : getPublicHouseDetails;
    const data = houses.map(house => {
      const postedById = house.postedBy?._id?.toString();
      const isFollowing = followingSet.has(postedById);
      return mapper(house, isFollowing);
    });
    const newPostsMapped = newPosts.map(house => {
      const postedById = house.postedBy?._id?.toString();
      const isFollowing = followingSet.has(postedById);
      return mapper(house, isFollowing);
    });
    console.timeEnd('Map houses for response');

    console.time('Prepare response');
    const lastHouse = houses[houses.length - 1];
    const nextCursor = lastHouse
      ? `${lastHouse.createdAt.toISOString()}|${lastHouse._id.toString()}`
      : null;

    res.status(200).json({
      data,
      limit,
      nextCursor,
      newPosts: newPostsMapped,
      firstNew,
      lastNew,
      absoluteLatest: {
        _id: absoluteLatest._id.toString(),
        createdAt: absoluteLatest.createdAt.toISOString(),
        title: absoluteLatest.title,
        location: absoluteLatest.location,
      },
    });
    console.timeEnd('Prepare response');

    console.timeEnd('Total getAllHouses');
  } catch (err) {
    console.error('❌ Get Houses Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
  console.log('🏁🏁🏁🏁🏁🏁🏁🏁🏁🏁🏁');
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
filter.flaggedForDeletion = { $ne: true };
    
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
       .populate('postedBy', 'username email profileImage')
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

const getUserHouses = async (req, res) => {
  try {
    const userId = req.params.userId;

    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const maxLimit = 20;
    if (limit > maxLimit) limit = maxLimit;
    const skip = (page - 1) * limit;

    const { location, title, maxPrice, minPrice, date } = req.query;
    const filter = { postedBy: userId };
    filter.flaggedForDeletion = { $ne: true };

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (title) {
      filter.title = { $regex: title, $options: 'i' };
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

    // Determine if user is moderator or admin
    const userRole = req.user?.role || 'user';
    const isModeratorOrAdmin = ['admin', 'moderator'].includes(userRole);

    // Fetch houses and total count in parallel
    // If NOT moderator/admin, we must filter hidden houses and hidden users

    let houses, total;

    if (isModeratorOrAdmin) {
      // No filtering on hidden state for mod/admin
      [houses, total] = await Promise.all([
        House.find(filter)
          .populate('postedBy', 'username email profileImage hidden banned')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        House.countDocuments(filter),
      ]);
    } else {
      // Normal users: filter hidden houses and hidden users
      const filteredFilter = { ...filter, hidden: { $ne: true } };

      // Find houses with postedBy populated, then filter out houses with hidden owners
      houses = await House.find(filteredFilter)
        .populate('postedBy', 'username email profileImage hidden ')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Filter out houses whose owners are hidden or banned
      houses = houses.filter(
  house => house.postedBy && !house.postedBy.hidden && !house.postedBy.banned
);

      // For total, count houses with hidden: false
      // Then filter out those whose owners are hidden by counting manually

      // Simple approximation: count documents with hidden false only (no postedBy check)
      // For precise total you can do aggregation but this is simpler:
      total = await House.countDocuments(filteredFilter);

      // Optional: adjust total by filtering houses with hidden owners, but that's more complex
      // Usually totalPages are approximate anyway
    }

    // Following set
    let followingSet = new Set();
    if (req.user?.id) {
      const currentUser = await User.findById(req.user.id).select('following');
      followingSet = new Set(currentUser.following.map(id => id.toString()));
    }

    const mapper = res.locals.showFullDetails
      ? getPrivateHouseDetails
      : getPublicHouseDetails;

    const data = houses.map(house => {
      const postedById = house.postedBy?._id?.toString();
      const isFollowing = followingSet.has(postedById);

      return res.locals.showFullDetails
        ? getPrivateHouseDetails(house, isFollowing)
        : getPublicHouseDetails(house);
    });

    const user = await User.findById(userId).select('username email profileImage');

    res.status(200).json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      user,
    });

  } catch (err) {
    console.error('Get Houses Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getHouseDetails = async (req, res) => {
  try {
    console.log(req.params.houseId);
    const house = await House.findById(req.params.houseId)
      .populate('postedBy', 'username email following profileImage') // optionally populate profileImage
      .populate('reviews.user', 'username email');

    if (!house) {
      return res.status(404).json({ error: 'House not found' });
    }

    let isFollowing = false;

    if (req.user?.id) {
      // Get current user with following list
      const currentUser = await User.findById(req.user.id).select('following');
      const followingSet = new Set(currentUser.following.map(id => id.toString()));
      const postedById = house.postedBy?._id?.toString();

      isFollowing = followingSet.has(postedById);
    }

    // Pass isFollowing to your mapper functions (adjust if needed)
    const houseData = req.user
      ? getPrivateHouseDetails(house, isFollowing)
      : getPublicHouseDetails(house);

    res.json(houseData);
  } catch (err) {
    console.error('Error fetching house:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const postHouse = async (req, res) => {
  try {
    const imagesUltraFiles = req.files['imagesUltra'] || [];
    const imagesPostFiles = req.files['imagesPost'] || [];

    if (imagesUltraFiles.length > 3 || imagesPostFiles.length > 3) {
      return res.status(400).json({ error: 'Maximum of 3 images allowed for each type.' });
    }

    const imagesUltraUrls = imagesUltraFiles.map(file => file.path);
    const imagesPostUrls = imagesPostFiles.map(file => file.path);

    const { title, description, location, price, category } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const categories = [
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

    const newHouse = new House({
      title,
      description,
      location,
      price,
      category,
      imagesUltra: imagesUltraUrls,
      imagesPost: imagesPostUrls,
      postedBy: user._id
    });

    await newHouse.save();

    user.postedHouses.push(newHouse._id);
    await user.save();

    const populatedHouse = await House.findById(newHouse._id).populate({
      path: 'postedBy',
      select: 'username email profileImage hidden banned'
    });

    const mappedHouse = getPublicHouseDetails(populatedHouse); // always use DTO

    const io = getSocketServer();
    io.emit('newHouse', mappedHouse);

    // Return the same DTO as response
    res.status(201).json({ message: 'House posted', house: mappedHouse });

  } catch (err) {
    console.error('Post House Error:', err);
    res.status(500).json({ error: err.message });
  }
};



const editHouse = async (req, res) => {
  try {
    const { houseId } = req.params;
    const userId = req.user.id;

    // Parse form fields
    const { title, description, location, category, price = [] } = req.body;
    const existingUrls = JSON.parse(req.body.existingUrls || '[]');

    // Get new uploaded files
    const imagesUltraFiles = req.files?.imagesUltra || [];
    const imagesPostFiles = req.files?.imagesPost || [];

    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ error: `House with ID ${houseId} not found` });
    }

    if (req.user.role !== 'admin' && house.postedBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: "User does not own this house" });
    }

    // Validate max image limit
    const currentCount = existingUrls.length;
    const newCount = imagesUltraFiles.length;
    const finalCount = currentCount + newCount;

    if (finalCount > 3) {
      return res.status(400).json({
        error: `Max 3 images allowed. Current: ${currentCount}, New: ${newCount}`,
      });
    }

    // Keep track of edits
    const edits = [];

    // Check imagesUltra changes
    const filteredUltra = house.imagesUltra.filter((url) => existingUrls.includes(url));
    if (JSON.stringify(filteredUltra) !== JSON.stringify(house.imagesUltra)) {
      edits.push({
        field: 'imagesUltra',
        oldValue: [...house.imagesUltra],
        newValue: filteredUltra,
      });
    }
    house.imagesUltra = filteredUltra;

    // Check imagesPost changes
    const filteredPost = house.imagesPost.filter((url) => existingUrls.includes(url));
    if (JSON.stringify(filteredPost) !== JSON.stringify(house.imagesPost)) {
      edits.push({
        field: 'imagesPost',
        oldValue: [...house.imagesPost],
        newValue: filteredPost,
      });
    }
    house.imagesPost = filteredPost;

    // Append new image paths
    if (imagesUltraFiles.length && imagesPostFiles.length) {
      const newUltraUrls = imagesUltraFiles.map((file) => file.path);
      const newPostUrls = imagesPostFiles.map((file) => file.path);

      edits.push({
        field: 'imagesUltra',
        oldValue: [...house.imagesUltra],
        newValue: [...house.imagesUltra, ...newUltraUrls],
      });
      edits.push({
        field: 'imagesPost',
        oldValue: [...house.imagesPost],
        newValue: [...house.imagesPost, ...newPostUrls],
      });

      house.imagesUltra.push(...newUltraUrls);
      house.imagesPost.push(...newPostUrls);
    }

    // Slice to max 3 images just in case
    house.imagesUltra = house.imagesUltra.slice(0, 3);
    house.imagesPost = house.imagesPost.slice(0, 3);

    // Helper to check and track changes for other fields
    function checkAndTrack(fieldName, newValue) {
      if (
        newValue !== undefined &&
        newValue !== null &&
        JSON.stringify(newValue) !== JSON.stringify(house[fieldName])
      ) {
        edits.push({
          field: fieldName,
          oldValue: house[fieldName],
          newValue,
        });
        house[fieldName] = newValue;
      }
    }

    checkAndTrack('title', title);
    checkAndTrack('description', description);
    checkAndTrack('location', location);
    checkAndTrack('category', category);
    checkAndTrack('price', price);

    await house.save();

    // Save all edits asynchronously, ignore if fails silently or you can log errors
    await Promise.all(
      edits.map((edit) =>
        addEditRecord({
          userId,
          targetId: houseId,
          targetType: 'house',
          field: edit.field,
          oldValue: edit.oldValue,
          newValue: edit.newValue,
        })
      )
    );

    
    // ✅ Populate user so socket clients get same DTO style
    const populatedHouse = await House.findById(house._id).populate({
      path: 'postedBy',
      select: 'username email profileImage hidden banned'
    });

    const mappedHouse = getPublicHouseDetails(populatedHouse);

    // ✅ WebSocket emit
    const io = getSocketServer();
    console.log("🔥 Emitting houseUpdated for:", mappedHouse.id);
    io.emit('houseUpdated', mappedHouse);
    
    res.status(200).json({ message: "House updated", house: mappedHouse });

  } catch (err) {
    console.error("Edit House Error:", err);
    res.status(500).json({
      error: "Failed to update house",
      details: err.message,
    });
  }
};


const deleteHouse = async (req, res) => {
  const { houseId } = req.params;
  console.log(houseId)

  try {

     const userId = req.user.id;

    const house = await House.findById(houseId);
    if (!house) 
      return res.status(404).json({ error: `House with ID ${houseId} not found` });

   if (req.user.role !== 'admin' && house.postedBy.toString() !== userId.toString()) {
  return res.status(403).json({ error: "User does not own this house" });
}
    // Optional: Delete images from Cloudinary if stored there
    // for (let imageUrl of house.images) {
    //   const publicId = extractPublicId(imageUrl); // You need to implement this
    //   await cloudinary.uploader.destroy(publicId);
    // }

  house.flaggedForDeletion = true;
    house.deleteAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now
    await house.save();

    res.status(200).json({
      message: 'House marked for deletion. It will be removed in 10 minutes.',
      deleteAt: house.deleteAt,
    });
  } catch (err) {
    console.error('Delete House Error:', err);
    res.status(500).json({ error: 'Failed to mark house for deletion', details: err.message });
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

const toggleOutOfStock = async (req, res) => {
    try {
    const houseId = req.params.houseId;
      console.log('toggleOutOfStock -> houseId:', houseId);
    const house = await House.findById(houseId);
    if (!house) return res.status(404).json({ message: 'House not found' });

    // Only owner can toggle
    if (house.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    house.outOfStock = !house.outOfStock;
    await house.save();

    res.status(200).json({ outOfStock: house.outOfStock });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const hideHouse = async (req, res) => {
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

    // 🔄 Update hidden field of the house
    const house = await House.findByIdAndUpdate(
      id,
      { hidden: hide },
      { new: true, select: 'title hidden' }
    );

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    // 📝 Log the action only when hiding (not unhide)
    if (reportId && hide) {
      try {
        await logActionToReport(
          reportId,
          'hide_house',
          req.user.id,
          `House titled "${house.title}" was hidden.`
        );
      } catch (logErr) {
        console.warn('Could not log action to report:', logErr.message);
      }
    }

    // ✅ Return updated house info
    res.json({
      message: `House is now ${hide ? 'hidden' : 'visible'}`,
      hidden: house.hidden,
    });

  } catch (err) {
    console.error('Error hiding house:', err);
    res.status(500).json({ message: 'Failed to update house visibility' });
  }
};



export const clickHouse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { houseId } = req.params;
console.log("🏠 houseId received:", houseId); // <-- log the houseId

    // Step 1: check if the user already clicked this house
    const alreadyClicked = await User.exists({
      _id: userId,
      "clickedPosts.house": houseId
    });

    if (alreadyClicked) {
      return res.status(200).json({ message: "Already clicked, not counted again" });
    }

    // Step 2: update both User & House
    await Promise.all([
      House.findByIdAndUpdate(houseId, {
        $inc: { clickCount: 1 },
        $set: { lastClickAt: new Date(),
           lastInteractionAt: new Date()
         }
      }),
      User.findByIdAndUpdate(userId, {
        $push: { clickedPosts: { house: houseId, clickedAt: new Date() } }
      })
    ]);

    return res.status(200).json({ message: "Click registered" });
  } catch (err) {
    console.error("❌ clickHouse error:", err);
    return res.status(500).json({ error: "Failed to register click" });
  }
};



export { getAllHouses,getMyHouses,getUserHouses, getHouseDetails,postHouse, editHouse ,deleteHouse , deleteReview, upsertReview,toggleOutOfStock };


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




/* my old get all houses 

const getAllHouses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    const maxLimit = 20;
    if (limit > maxLimit) limit = maxLimit;
    const skip = (page - 1) * limit;

    const {
      location,
      search,  // use this instead of title
      maxPrice,
      minPrice,
      timeAmount,
      timeUnit,
    } = req.query;

    const categoriesQuery = req.query.interestedCategories;
    const match = {};
    match.flaggedForDeletion = { $ne: true };

    // Categories filter
    if (categoriesQuery) {
      const categories = Array.isArray(categoriesQuery)
        ? categoriesQuery
        : categoriesQuery.split(',');
      match.category = { $in: categories };
    }

    // Location filter (partial match)
    if (location) {
      match.location = { $regex: location, $options: 'i' };
    }

    // Search filter: full-text on title + description
    if (search) {
      match.$text = { $search: search };
    }

    // Price filter
    if (maxPrice || minPrice) {
      match.price = {};
      if (minPrice) match.price.$gte = Number(minPrice);
      if (maxPrice) match.price.$lte = Number(maxPrice);
    }

    // Time filter
    if (timeAmount && timeUnit) {
      const now = new Date();
      const amount = parseInt(timeAmount, 10);
      const cutoff = new Date(now);
      switch (timeUnit) {
        case "minutes": cutoff.setMinutes(now.getMinutes() - amount); break;
        case "hours": cutoff.setHours(now.getHours() - amount); break;
        case "days": cutoff.setDate(now.getDate() - amount); break;
        case "weeks": cutoff.setDate(now.getDate() - amount * 7); break;
        case "months": cutoff.setMonth(now.getMonth() - amount); break;
        case "years": cutoff.setFullYear(now.getFullYear() - amount); break;
      }
      match.createdAt = { $gte: cutoff };
    }

    const userRole = req.user?.role || 'user';
    console.log('User role:', userRole); 
    const isModeratorOrAdmin = ['admin', 'moderator'].includes(userRole);

    let userCity = null;
    if (req.user?.id) {
      const user = await User.findById(req.user.id).select('city');
      userCity = user?.city || null;
    }
    if (location) userCity = null;

    const pipeline = [{ $match: match }];

    // Sort by relevance if searching, else normal sorting with city boost
    if (search) {
      pipeline.push(
        { $addFields: { score: { $meta: "textScore" } } },
        { $sort: { score: -1, createdAt: -1 } }
      );
    } else if (userCity) {
      pipeline.push(
        {
          $addFields: {
            iscity: { $cond: [{ $eq: ["$location", userCity] }, 1, 0] }
          }
        },
        { $sort: { iscity: -1, createdAt: -1 } }
      );
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
  {
    $lookup: {
      from: 'users',
      localField: 'postedBy',
      foreignField: '_id',
      as: 'postedBy'
    }
  },
  { $unwind: '$postedBy' }
);

if (!isModeratorOrAdmin) {
  // Only filter hidden/banned for normal users
  pipeline.push({
    $match: {
      'postedBy.hidden': false,
      'postedBy.banned': { $ne: true },
      hidden: { $ne: true }
    }
  });
}
    // Copy pipeline for total count (exclude skip/limit)
    const countPipeline = [...pipeline];
    // Add count stage
    countPipeline.push({ $count: 'totalCount' });

    const countResult = await House.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].totalCount : 0;

    // Add pagination to original pipeline after counting
    pipeline.push({ $skip: skip }, { $limit: limit });

    let houses = await House.aggregate(pipeline);

    houses = await House.populate(houses, {
      path: 'postedBy',
      select: 'username email profileImage hidden banned'
    });

    let followingSet = new Set();
    if (req.user?.id) {
      const currentUser = await User.findById(req.user.id).select('following');
      followingSet = new Set(currentUser.following.map(id => id.toString()));
    }

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

    res.status(200).json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error('Get Houses Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

*/