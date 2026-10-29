import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssistanceRequest', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'pending', 'completed', 'failed', 'simulated'],
      default: 'created',
      index: true,
    },
    razorpayOrderId: { type: String, sparse: true, index: true },
    razorpayPaymentId: { type: String, sparse: true, index: true },
    razorpaySignature: { type: String },
    notes: { type: String, trim: true },
    isAnonymous: { type: Boolean, default: false },
    donorName: { type: String, trim: true },
    donorEmail: { type: String, trim: true },
    donorPhone: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Donation', donationSchema);