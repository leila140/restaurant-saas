const tenant = (req, res, next) => {
  if (!req.user || !req.user.restaurantId) {
    return res.status(403).json({ error: "No restaurant context" });
  }

  req.restaurantId = req.user.restaurantId;
  next();
};

module.exports = tenant;
