const partialHouseData = (req, res, next) => {
  res.locals.showFullDetails = !!req.user;
  next();
};
export default partialHouseData;