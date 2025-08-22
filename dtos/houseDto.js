export const getPublicHouseDetails = (house) => {
  return {
    id: house._id,
    title: house.title,
    outOfStock: house.outOfStock,
    hidden: house.hidden, 
    description: house.description,
    location: house.location,
    category: house.category,
     imagesUltra: Array.isArray(house.imagesUltra) ? house.imagesUltra : [],
    imagesPost: Array.isArray(house.imagesPost) ? house.imagesPost : [],
      createdAt: house.createdAt, 
    postedBy: {
      username: house.postedBy?.username,
      id: house.postedBy?._id?.toString(),
      email: house.postedBy?.email,
      banned: house.postedBy?.banned || false,
      hidden: house.postedBy?.hidden || false, 
      profileImage: {
  ultra: house.postedBy?.profileImage.ultra || null,
compressed: house.postedBy?.profileImage.compressed || null,
}
    }
    // Other non-sensitive fields
  };
};

export const getPrivateHouseDetails = (house,isFollowing) => {
  return {
    ...getPublicHouseDetails(house),
    price: house.price,
     isFollowing,
   
    // Other sensitive fields
  };
};
