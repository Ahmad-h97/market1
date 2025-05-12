import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  code: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expires: '15m' } // Auto-delete after 15 minutes
  },
  attempts: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Add TTL index to auto-delete documents after `expiresAt` time passes
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Verification', verificationSchema);