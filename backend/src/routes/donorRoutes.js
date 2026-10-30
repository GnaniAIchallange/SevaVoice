import { Router } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AssistanceRequest, AuditLog, Donation, User } from '../models/index.js';
import { REQUEST_STATUS, ROLES } from '../utils/constants.js';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/paymentService.js';

// Optional donor authentication middleware (allows anonymous browsing while attaching user if token present)
function optionalAuth(req, _res, next) {
  const authorization = req.get('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
      if (typeof payload !== 'string' && typeof payload.sub === 'string') {
        req.auth = { userId: payload.sub, role: payload.role };
      }
    } catch {
      // Ignore token verification errors for public browsing
    }
  }
  return next();
}

function requireAuth(req, res, next) {
  const authorization = req.get('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.auth = { userId: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function createDonorRouter({
  UserModel = User,
  AssistanceRequestModel = AssistanceRequest,
  DonationModel = Donation,
  AuditLogModel = AuditLog,
  orderCreator = createRazorpayOrder,
  signatureVerifier = verifyPaymentSignature,
} = {}) {
  const router = Router();

  // Helper to get verified farmer IDs
  async function getVerifiedFarmerIds(locationFilter = {}) {
    const query = {
      role: ROLES.FARMER,
      isActive: true,
      $or: [
        { farmerVerificationStatus: 'verified' },
        { verificationStatus: 'verified' },
      ],
      ...locationFilter,
    };
    const verifiedFarmers = await UserModel.find(query).select('_id').lean();
    return verifiedFarmers.map((f) => f._id);
  }

  // Donor overview stats & recent approved requests
  router.get('/overview', optionalAuth, async (req, res) => {
    try {
      const verifiedFarmerIds = await getVerifiedFarmerIds();

      const approvedRequestsFilter = {
        status: REQUEST_STATUS.APPROVED,
        farmerId: { $in: verifiedFarmerIds },
      };

      const [availableRequestsCount, recentApprovedRequests, donorContributionsCount] = await Promise.all([
        AssistanceRequestModel.countDocuments(approvedRequestsFilter),
        AssistanceRequestModel.find(approvedRequestsFilter)
          .populate('farmerId', 'name village district state cropType landSizeAcres farmerVerificationStatus')
          .sort({ createdAt: -1 })
          .limit(4)
          .lean(),
        req.auth?.userId ? DonationModel.countDocuments({ donorId: req.auth.userId }) : 0,
      ]);

      const formattedRecent = recentApprovedRequests.map((item) => {
        const farmer = item.farmerId || {};
        return {
          id: item._id,
          title: item.title || item.purpose || 'Agricultural Assistance Request',
          category: item.category || 'other',
          amountRequested: item.amountRequested || 0,
          amountFunded: item.amountFunded || 0,
          purpose: item.purpose || item.reason || '',
          reason: item.reason || item.purpose || '',
          intendedUse: item.intendedUse || item.purpose || '',
          createdAt: item.createdAt,
          farmer: {
            name: farmer.name,
            village: farmer.village,
            district: farmer.district,
            state: farmer.state,
            cropType: farmer.cropType,
            isVerified: true,
          },
        };
      });

      return res.json({
        availableRequestsCount,
        donorContributionsCount,
        recentApprovedRequests: formattedRecent,
      });
    } catch (error) {
      console.error('Error in donor overview:', error);
      return res.status(500).json({ message: 'Unable to load donor overview' });
    }
  });

  // Browse approved assistance requests with search, filter, sort, pagination
  router.get('/requests', optionalAuth, async (req, res) => {
    try {
      const { search, category, state, district, sort = 'newest', page = '1', limit = '9' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 9));
      const skip = (pageNum - 1) * limitNum;

      // Filter verified farmers with optional location constraints
      const locationFilter = {};
      if (state && state !== 'all') {
        locationFilter.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
      }
      if (district && district !== 'all') {
        locationFilter.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
      }

      const verifiedFarmerIds = await getVerifiedFarmerIds(locationFilter);

      const requestFilter = {
        status: REQUEST_STATUS.APPROVED,
        farmerId: { $in: verifiedFarmerIds },
      };

      if (category && category !== 'all') {
        requestFilter.category = category;
      }

      if (search && search.trim()) {
        const term = search.trim();
        requestFilter.$or = [
          { title: { $regex: term, $options: 'i' } },
          { purpose: { $regex: term, $options: 'i' } },
          { reason: { $regex: term, $options: 'i' } },
        ];
      }

      // Sort configuration
      let sortOptions = { createdAt: -1 };
      if (sort === 'amount_asc') {
        sortOptions = { amountRequested: 1 };
      } else if (sort === 'amount_desc') {
        sortOptions = { amountRequested: -1 };
      } else if (sort === 'oldest') {
        sortOptions = { createdAt: 1 };
      }

      const [total, requests] = await Promise.all([
        AssistanceRequestModel.countDocuments(requestFilter),
        AssistanceRequestModel.find(requestFilter)
          .populate('farmerId', 'name village district state cropType landSizeAcres farmerVerificationStatus')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);

      const items = requests.map((item) => {
        const farmer = item.farmerId || {};
        const remainingGoal = Math.max(0, (item.amountRequested || 0) - (item.amountFunded || 0));

        return {
          id: item._id,
          title: item.title || item.purpose || 'Agricultural Assistance Request',
          category: item.category || 'other',
          amountRequested: item.amountRequested || 0,
          amountFunded: item.amountFunded || 0,
          remainingGoal,
          purpose: item.purpose || item.reason || '',
          reason: item.reason || item.purpose || '',
          intendedUse: item.intendedUse || item.purpose || '',
          createdAt: item.createdAt,
          verificationBadge: {
            farmerVerified: true,
            requestApproved: true,
            label: 'Verified Farmer & Approved Request',
          },
          farmer: {
            name: farmer.name,
            village: farmer.village,
            district: farmer.district,
            state: farmer.state,
            cropType: farmer.cropType,
            landSizeAcres: farmer.landSizeAcres,
            farmerVerificationStatus: 'verified',
          },
        };
      });

      return res.json({
        items,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (error) {
      console.error('Error listing donor requests:', error);
      return res.status(500).json({ message: 'Unable to retrieve approved requests' });
    }
  });

  // Public details of a single approved assistance request
  router.get('/requests/:id', optionalAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid request identifier' });
      }

      const requestItem = await AssistanceRequestModel.findById(id)
        .populate('farmerId', 'name village district state cropType landSizeAcres farmerVerificationStatus verificationStatus isActive')
        .lean();

      if (!requestItem) {
        return res.status(404).json({ message: 'Request not found' });
      }

      const farmer = requestItem.farmerId;
      const isFarmerVerified =
        farmer &&
        farmer.isActive &&
        (farmer.farmerVerificationStatus === 'verified' || farmer.verificationStatus === 'verified');

      // CRITICAL SECURITY RULE: never disclose unapproved requests or requests from unverified farmers
      if (requestItem.status !== REQUEST_STATUS.APPROVED || !isFarmerVerified) {
        return res.status(404).json({
          message: 'This request is not currently published or eligible for donations.',
        });
      }

      const remainingGoal = Math.max(0, (requestItem.amountRequested || 0) - (requestItem.amountFunded || 0));

      return res.json({
        request: {
          id: requestItem._id,
          title: requestItem.title || requestItem.purpose || 'Agricultural Assistance Request',
          category: requestItem.category || 'other',
          amountRequested: requestItem.amountRequested || 0,
          amountFunded: requestItem.amountFunded || 0,
          remainingGoal,
          purpose: requestItem.purpose || requestItem.reason || '',
          reason: requestItem.reason || requestItem.purpose || '',
          intendedUse: requestItem.intendedUse || requestItem.purpose || '',
          supportingEvidence: requestItem.supportingEvidence || [],
          createdAt: requestItem.createdAt,
          status: 'approved',
          verificationBadge: {
            farmerVerified: true,
            requestApproved: true,
            label: 'Identity & Land Ownership Verified by SevaVoice Verifiers',
          },
        },
        farmer: {
          name: farmer.name,
          village: farmer.village,
          district: farmer.district,
          state: farmer.state,
          cropType: farmer.cropType,
          landSizeAcres: farmer.landSizeAcres,
          verificationStatus: 'verified',
          verificationNote: 'Farmer identity and agricultural documents have been independently inspected and approved.',
        },
      });
    } catch (error) {
      console.error('Error fetching single request:', error);
      return res.status(500).json({ message: 'Unable to retrieve request details' });
    }
  });

  // Authenticated donor donation history (real records only)
  router.get('/history', requireAuth, async (req, res) => {
    try {
      const donations = await DonationModel.find({ donorId: req.auth.userId })
        .populate({
          path: 'requestId',
          select: 'title purpose category amountRequested amountFunded farmerId',
          populate: { path: 'farmerId', select: 'name village district state' },
        })
        .sort({ createdAt: -1 })
        .lean();

      const items = donations.map((donation) => ({
        id: donation._id,
        amount: donation.amount,
        status: donation.status,
        date: donation.createdAt,
        request: donation.requestId
          ? {
              id: donation.requestId._id,
              title: donation.requestId.title || donation.requestId.purpose,
              category: donation.requestId.category,
              farmerName: donation.requestId.farmerId?.name,
              location: [
                donation.requestId.farmerId?.village,
                donation.requestId.farmerId?.district,
                donation.requestId.farmerId?.state,
              ]
                .filter(Boolean)
                .join(', '),
            }
          : null,
      }));

      return res.json({ donations: items });
    } catch (error) {
      console.error('Error fetching donor history:', error);
      return res.status(500).json({ message: 'Unable to retrieve donation history' });
    }
  });

  // Create Razorpay Order for donation
  router.post('/create-order', optionalAuth, async (req, res) => {
    try {
      const orderSchema = z.object({
        requestId: z.string().min(1),
        amount: z.coerce.number().int().min(1, 'Donation amount must be at least ₹1'),
        notes: z.string().trim().optional(),
        isAnonymous: z.boolean().optional(),
        donorName: z.string().trim().optional(),
        donorEmail: z.string().trim().optional(),
        donorPhone: z.string().trim().optional(),
      });

      const parsed = orderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Invalid request data',
          errors: parsed.error.issues.map((i) => i.message),
        });
      }

      const { requestId, amount, notes, isAnonymous, donorName, donorEmail, donorPhone } = parsed.data;

      if (!mongoose.isValidObjectId(requestId)) {
        return res.status(400).json({ message: 'Invalid request identifier' });
      }

      const requestItem = await AssistanceRequestModel.findById(requestId)
        .populate('farmerId', 'name farmerVerificationStatus verificationStatus isActive')
        .lean();

      if (!requestItem) {
        return res.status(404).json({ message: 'Assistance request not found' });
      }

      const farmer = requestItem.farmerId;
      const isFarmerVerified =
        farmer &&
        farmer.isActive &&
        (farmer.farmerVerificationStatus === 'verified' || farmer.verificationStatus === 'verified');

      if (requestItem.status !== REQUEST_STATUS.APPROVED || !isFarmerVerified) {
        return res.status(400).json({
          message: 'This request is not currently eligible for contributions',
        });
      }

      // Create Razorpay order
      const order = await orderCreator({
        amount,
        currency: 'INR',
        receipt: `seva_${Date.now()}`,
        notes: {
          requestId: String(requestItem._id),
          donorId: req.auth?.userId || 'guest',
        },
      });

      // Persist donation record
      const donation = await DonationModel.create({
        donorId: req.auth?.userId || null,
        requestId: requestItem._id,
        amount,
        currency: order.currency || 'INR',
        status: 'created',
        razorpayOrderId: order.orderId,
        notes: notes || '',
        isAnonymous: Boolean(isAnonymous),
        donorName: donorName || '',
        donorEmail: donorEmail || '',
        donorPhone: donorPhone || '',
      });

      return res.status(201).json({
        success: true,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency || 'INR',
        keyId: order.keyId,
        donationId: donation._id,
        isSimulated: Boolean(order.isSimulated),
      });
    } catch (error) {
      console.error('Error creating donation order:', error);
      return res.status(500).json({ message: 'Unable to initiate donation payment' });
    }
  });

  // Verify Razorpay payment and complete donation
  router.post('/verify-payment', optionalAuth, async (req, res) => {
    try {
      const verifySchema = z.object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
        donationId: z.string().optional(),
      });

      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Invalid payment verification payload',
          errors: parsed.error.issues.map((i) => i.message),
        });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, donationId } = parsed.data;

      let donation = null;
      if (donationId && mongoose.isValidObjectId(donationId)) {
        donation = await DonationModel.findById(donationId);
      }
      if (!donation && razorpay_order_id) {
        donation = await DonationModel.findOne({ razorpayOrderId: razorpay_order_id });
      }

      if (!donation) {
        return res.status(404).json({ message: 'Donation record not found for this order' });
      }

      if (donation.status === 'completed') {
        return res.json({
          success: true,
          message: 'Payment already verified successfully',
          donation: {
            id: donation._id,
            amount: donation.amount,
            status: donation.status,
            razorpayPaymentId: donation.razorpayPaymentId,
          },
        });
      }

      const isSimulated =
        razorpay_order_id.startsWith('order_') &&
        (razorpay_signature === 'simulated_success_sig' || razorpay_signature.startsWith('mock_sig_'));

      const isValid = signatureVerifier({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        isSimulated,
      });

      if (!isValid) {
        donation.status = 'failed';
        if (typeof donation.save === 'function') await donation.save();
        return res.status(400).json({ message: 'Invalid payment signature verification' });
      }

      donation.status = 'completed';
      donation.razorpayPaymentId = razorpay_payment_id;
      donation.razorpaySignature = razorpay_signature;
      if (typeof donation.save === 'function') {
        await donation.save();
      }

      // Update AssistanceRequest funded amount
      if (typeof AssistanceRequestModel.findByIdAndUpdate === 'function') {
        const updatedRequest = await AssistanceRequestModel.findByIdAndUpdate(
          donation.requestId,
          { $inc: { amountFunded: donation.amount } },
          { returnDocument: 'after' }
        );

        if (
          updatedRequest &&
          updatedRequest.amountFunded >= updatedRequest.amountRequested &&
          updatedRequest.status === REQUEST_STATUS.APPROVED
        ) {
          updatedRequest.status = REQUEST_STATUS.FUNDED;
          if (typeof updatedRequest.save === 'function') {
            await updatedRequest.save();
          }
        }
      }

      if (typeof AuditLogModel.create === 'function') {
        await AuditLogModel.create({
          actorId: donation.donorId || donation.requestId,
          action: 'DONATION_RECEIVED',
          targetType: 'AssistanceRequest',
          targetId: donation.requestId,
          after: {
            amount: donation.amount,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
          },
          note: `Received Razorpay donation of ₹${donation.amount}`,
        }).catch(() => {});
      }

      return res.json({
        success: true,
        message: 'Payment verified and donation completed successfully! Thank you for supporting the farmer.',
        donation: {
          id: donation._id,
          amount: donation.amount,
          currency: donation.currency || 'INR',
          status: donation.status,
          razorpayPaymentId: donation.razorpayPaymentId,
          razorpayOrderId: donation.razorpayOrderId,
          createdAt: donation.createdAt,
        },
      });
    } catch (error) {
      console.error('Error verifying donation payment:', error);
      return res.status(500).json({ message: 'Unable to verify payment' });
    }
  });

  return router;
}

export default createDonorRouter();
