import mongoose from 'mongoose';
import { ROLES, LANGUAGES, VERIFICATION_STATUS } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    passwordHash: { type: String, select: false },
    farmerRegistrationKey: { type: String, unique: true, sparse: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    preferredLanguage: { type: String, enum: LANGUAGES, default: 'en' },
    isActive: { type: Boolean, default: true },

    village: { type: String, trim: true, maxlength: 100 },
    district: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    landSizeAcres: { type: Number, min: 0, max: 10000 },
    cropType: { type: String, trim: true, maxlength: 100 },

    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    farmerVerificationStatus: {
      type: String,
      enum: ['pending', 'under_review', 'additional_information_required', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationAssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationSubmittedAt: { type: Date },
    verifiedAt: { type: Date },
    verificationRemarks: { type: String, trim: true },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);