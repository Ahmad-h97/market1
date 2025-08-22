import mongoose from 'mongoose';

const editHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // can be houseId or userId depending on targetType
  },
  targetType: {
    type: String,
    enum: ['house', 'user', 'profilePic', 'username'],
    required: true,
  },
  field: {
    type: String,
    required: true, // e.g. "description", "images"
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast queries by targetType + targetId
editHistorySchema.index({ targetType: 1, targetId: 1 });


export default mongoose.model('EditHistory', editHistorySchema);
