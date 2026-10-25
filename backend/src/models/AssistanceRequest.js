import mongoose from 'mongoose';
import { REQUEST_STATUS, REQUEST_CATEGORIES, LANGUAGES } from '../utils/constants.js';

const assistanceRequestSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true },
    reason: { type: String, trim: true },
    intendedUse: { type: String, trim: true },
    amountRequested: { type: Number, min: 1 },
    amountFunded: { type: Number, default: 0, min: 0 },
    purpose: { type: String, trim: true },
    category: { type: String, enum: REQUEST_CATEGORIES },
    language: { type: String, enum: LANGUAGES },
    supportingEvidence: [{ type: String, trim: true }],
    transcript: { type: String },
    extractedFields: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.SUBMITTED,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

assistanceRequestSchema.index({ status: 1, createdAt: -1 });
assistanceRequestSchema.index({ farmerId: 1 });

export default mongoose.model('AssistanceRequest', assistanceRequestSchema);