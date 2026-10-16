import mongoose from 'mongoose';
import { VERIFICATION_STATUS } from '../utils/constants.js';

const farmerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    village: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    landSizeAcres: { type: Number, min: 0 },
    cropType: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

farmerProfileSchema.index({ verificationStatus: 1 });

export default mongoose.model('FarmerProfile', farmerProfileSchema);