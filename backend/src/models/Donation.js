import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssistanceRequest', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['simulated'], default: 'simulated' },
  },
  { timestamps: true }
);

export default mongoose.model('Donation', donationSchema);