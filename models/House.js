import mongoose from 'mongoose';

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
  category:{ type: String ,require : true},
    outOfStock: {
    type: Boolean,
    default: false,  // default is "in stock"
  },
  imagesUltra: {
    type: [{ type: String }],
    validate: [arrayLimit, 'Cannot upload more than 3 ultra images']
  },

  imagesPost: {
    type: [{ type: String }],
    validate: [arrayLimit, 'Cannot upload more than 3 post images']
  },
  hidden: {
  type: Boolean,
  default: false,
},
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  favCount: { type: Number, default: 0 },
  reviews: [reviewSchema],
  flaggedForDeletion: { type: Boolean, default: false },
  deleteAt: { type: Date, default: null },

  hiddenByModerator: {
  type: Boolean,
  default: false
},
moderationMessage: {
  type: String,
  default: ''
}

}, { timestamps: true });

houseSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });
houseSchema.index({ title: 'text', description: 'text' });
const House = mongoose.model('House', houseSchema);
export default House;