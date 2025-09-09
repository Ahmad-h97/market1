// models/UserPostInteraction.js
import mongoose from 'mongoose';

const userPostInteractionSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  houseId: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },

  seenAt:    { type: Date, default: Date.now },
  clicked:   { type: Boolean, default: false },
  clickedAt: { type: Date, default: null },

  // TTL-style expiry so "seen" fades out after a week (tune as you like)
  expireAt: { type: Date, default: () => new Date(Date.now() + 7*24*60*60*1000) },
});

// One row per (user, house) enforces “count once”
userPostInteractionSchema.index({ userId: 1, houseId: 1 }, { unique: true });

// TTL index – documents auto-delete after expireAt passes
userPostInteractionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('UserPostInteraction', userPostInteractionSchema);
