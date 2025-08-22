import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  itemType: { type: String, enum: ['house',  'user'], required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  
  reportedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    credibility: Number,
    reason: String  // <-- added here
  }],
  totalReports: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'dismissed', 'action_taken'],
    default: 'pending'
  },
  dismissedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dismissedAt: { type: Date , default: Date.now},

  
 actionsTaken: [{
    action: { type: String, enum: ['hide_house', 'hide_user', 'suspend_user', 'ban_user', 'delete_house'] },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
