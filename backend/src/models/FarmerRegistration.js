import mongoose from 'mongoose';
import { VERIFICATION_STATUS } from '../utils/constants.js';

const farmerRegistrationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },
    village: { type: String, required: true, trim: true, maxlength: 100 },
    district: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    landSizeAcres: {
      type: Number,
      required: true,
      min: Number.MIN_VALUE,
      max: 10000,
    },
    cropType: { type: String, required: true, trim: true, maxlength: 100 },
    preferredLanguage: {
      type: String,
      enum: ['mr-IN', 'hi-IN', 'en-IN'],
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
  },
  { timestamps: true }
);

farmerRegistrationSchema.index({ mobileNumber: 1 }, { unique: true });

export default mongoose.model('FarmerRegistration', farmerRegistrationSchema);
