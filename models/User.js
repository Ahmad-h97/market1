import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true,unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  hidden: {
  type: Boolean,
  default: false,
},
   role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  city: { type: String},
  profileImage: {
    ultra: { type: String, default: '' },
    compressed: { type: String, default: '' },
  },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  refreshToken: { type: String, default: '' },
  postedHouses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'House' }],
  favorites:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'House' }],
   skipHashing: { type: Boolean, select: false }, 
     resetToken: { type: String },
  resetTokenExpires: { type: Date },
  flaggedForDeletion: { type: Boolean, default: false },
  deleteAt: { type: Date, default: null },

  credibilityScore: { type: Number, default: 50 }, // starts neutral
 suspensionCount: { type: Number, default: 0 },

  suspended: {
    isSuspended: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    suspendedAt: { type: Date },
    suspensionExpiresAt: { type: Date, default: null },
  },

 banned: {
  isBanned: { type: Boolean, default: false },
  reason: { type: String, default: '' },
  bannedAt: { type: Date, default: null },
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } // optional: moderator/admin who banned
},
  
moderationMessage: {
  message: { type: String, default: '' },
  type: {
    type: String,
    enum: ['info', 'warning', 'positive'],
    default: 'info'
  }
},
  seenPosts: [
  {
    house: { type: mongoose.Schema.Types.ObjectId, ref: 'House' },
    seenAt: { type: Date, default: Date.now }
  }
],
clickedPosts: [
  {
    house: { type: mongoose.Schema.Types.ObjectId, ref: 'House' },
    clickedAt: { type: Date, default: Date.now }
  }
]
}, { timestamps: true });


userSchema.pre('save', async function (next) {
  if (this.skipHashing) return next();

  if (!this.isModified('password')) return next();
  
  console.log('[HOOK] Password before hashing:', this.password); 
  this.password = await bcrypt.hash(this.password, 10);
   console.log('[HOOK] Hashed password:', this.password);
  next();
  });
  
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
  };
    
userSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });


const User = mongoose.model('User', userSchema);
export default User;