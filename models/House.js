const mongoose = require('mongoose');

function arrayLimit(val) {
  return val.length <= 3;
}


const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  createdAt: { type: Date, default: Date.now }
});


const houseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  images: {
    type: [{ type: String }],
    validate: [arrayLimit, 'Cannot upload more than 3 images']
  },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  favCount: { type: Number, default: 0 },
  reviews: [reviewSchema]
}, { timestamps: true });

module.exports = mongoose.model('House', houseSchema);