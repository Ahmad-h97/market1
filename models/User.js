import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true,unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  city: { type: String},
  refreshToken: { type: String, default: '' },
  postedHouses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'House' }],
  favorites:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'House' }],
   skipHashing: { type: Boolean, select: false }, 
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
    

const User = mongoose.model('User', userSchema);
export default User;