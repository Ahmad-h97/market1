export const getPublicHouseDetails = (house) => {
  return {
    id: house._id,
    title: house.title,
    location: house.location,
    // Other non-sensitive fields
  };
};

export const getPrivateHouseDetails = (house) => {
  return {
    ...getPublicHouseDetails(house),
    price: house.price,
    postedBy: {
      username: house.postedBy?.username,
      email: house.postedBy?.email
    }
    // Other sensitive fields
  };
};
