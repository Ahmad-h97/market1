export const getPublicHouseDetails = (house) => {
  return {
    id: house._id,
    title: house.title,
    description: house.description,
    location: house.location,
    category: house.category,
     images: Array.isArray(house.images) ? house.images : [],
    // Other non-sensitive fields
  };
};

export const getPrivateHouseDetails = (house) => {
  return {
    ...getPublicHouseDetails(house),
    price: house.price,
    postedBy: {
      username: house.postedBy?.username,
      id: house.postedBy?._id?.toString(),
      email: house.postedBy?.email,
      profileImage: house.postedBy?.profileImage || null, 
    }
    // Other sensitive fields
  };
};
