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

export default mongoose.model('Verification', verificationSchema);