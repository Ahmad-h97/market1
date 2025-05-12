import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true,unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  refreshToken: { type: String, default: '' },
  postedHouses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'House' }],
  favorites:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'House' }],
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-delete unverified accounts after 24 hours
userSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 86400, // 24 hours
  partialFilterExpression: { isVerified: false } 
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
  });
  
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
  };
    

const User = mongoose.model('User', userSchema);
export default User;