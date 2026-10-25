import mongoose from 'mongoose';
import { DOCUMENT_TYPES, DOCUMENT_STATUS } from '../utils/constants.js';

const documentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    storageKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    verificationStatus: {
      type: String,
      enum: Object.values(DOCUMENT_STATUS),
      default: DOCUMENT_STATUS.PENDING,
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    remarks: { type: String, trim: true },

    // Set when the farmer uploads a new file to replace a rejected one
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  },
  { timestamps: true }
);

documentSchema.index({ ownerId: 1, type: 1 });

export default mongoose.model('Document', documentSchema);