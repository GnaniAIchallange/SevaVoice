import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { AssistanceRequest, AuditLog, Document, Donation, User } from '../models/index.js';
import { REQUEST_STATUS, ROLES, VERIFICATION_STATUS } from '../utils/constants.js';

function requireAdmin(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.auth.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: 'Access denied: Administrator permissions required' });
  }
  return next();
}

export function createAdminRouter({
  UserModel = User,
  AssistanceRequestModel = AssistanceRequest,
  DonationModel = Donation,
  DocumentModel = Document,
  AuditLogModel = AuditLog,
} = {}) {
  const router = Router();

  // Protect all admin endpoints
  router.use(authenticateToken);
  router.use(requireAdmin);

  // 1. System Statistics & Financial Overview
  router.get('/stats', async (_req, res) => {
    try {
      const [
        totalUsers,
        farmersCount,
        donorsCount,
        verifiersCount,
        adminsCount,
        activeUsersCount,
        inactiveUsersCount,
        verifiedFarmersCount,
        pendingFarmersCount,
        rejectedFarmersCount,
        totalRequestsCount,
        approvedRequestsCount,
        submittedRequestsCount,
        underReviewRequestsCount,
        fundedRequestsCount,
        rejectedRequestsCount,
        donations,
        requestsAggregation,
        recentLogs,
      ] = await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ role: ROLES.FARMER }),
        UserModel.countDocuments({ role: ROLES.DONOR }),
        UserModel.countDocuments({ role: ROLES.VERIFIER }),
        UserModel.countDocuments({ role: ROLES.ADMIN }),
        UserModel.countDocuments({ isActive: true }),
        UserModel.countDocuments({ isActive: false }),
        UserModel.countDocuments({
          role: ROLES.FARMER,
          $or: [{ farmerVerificationStatus: 'verified' }, { verificationStatus: 'verified' }],
        }),
        UserModel.countDocuments({
          role: ROLES.FARMER,
          farmerVerificationStatus: { $in: ['pending', 'under_review'] },
        }),
        UserModel.countDocuments({
          role: ROLES.FARMER,
          farmerVerificationStatus: 'rejected',
        }),
        AssistanceRequestModel.countDocuments(),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.APPROVED }),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.SUBMITTED }),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.UNDER_REVIEW }),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.FUNDED }),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.REJECTED }),
        DonationModel.find().select('amount status').lean(),
        AssistanceRequestModel.aggregate([
          {
            $group: {
              _id: null,
              totalRequested: { $sum: '$amountRequested' },
              totalFunded: { $sum: '$amountFunded' },
            },
          },
        ]).catch(() => []),
        AuditLogModel.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('actorId', 'name role')
          .lean()
          .catch(() => []),
      ]);

      const totalDonationsCount = donations.length;
      const completedDonations = donations.filter((d) => d.status === 'completed' || d.status === 'simulated');
      const totalFundsRaised = completedDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalFundsRequested = requestsAggregation[0]?.totalRequested || 0;
      const totalFundedFromRequests = requestsAggregation[0]?.totalFunded || 0;

      return res.json({
        users: {
          total: totalUsers,
          farmers: farmersCount,
          donors: donorsCount,
          verifiers: verifiersCount,
          admins: adminsCount,
          active: activeUsersCount,
          inactive: inactiveUsersCount,
        },
        farmers: {
          verified: verifiedFarmersCount,
          pending: pendingFarmersCount,
          rejected: rejectedFarmersCount,
        },
        requests: {
          total: totalRequestsCount,
          approved: approvedRequestsCount,
          submitted: submittedRequestsCount,
          underReview: underReviewRequestsCount,
          funded: fundedRequestsCount,
          rejected: rejectedRequestsCount,
        },
        financials: {
          totalFundsRequested,
          totalFundsRaised: Math.max(totalFundsRaised, totalFundedFromRequests),
          totalDonationsCount,
          completedDonationsCount: completedDonations.length,
          averageDonation: completedDonations.length
            ? Math.round(totalFundsRaised / completedDonations.length)
            : 0,
        },
        recentActivities: recentLogs.map((log) => ({
          id: log._id,
          action: log.action,
          targetType: log.targetType,
          note: log.note,
          actor: log.actorId ? { name: log.actorId.name, role: log.actorId.role } : null,
          createdAt: log.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error in admin stats:', error);
      return res.status(500).json({ message: 'Unable to retrieve admin dashboard statistics' });
    }
  });

  // 2. User Management: List users with filters, search, and pagination
  router.get('/users', async (req, res) => {
    try {
      const { role, status, search, verificationStatus, page = '1', limit = '15', sort = 'newest' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
      const skip = (pageNum - 1) * limitNum;

      const query = {};

      if (role && role !== 'all' && Object.values(ROLES).includes(role)) {
        query.role = role;
      }

      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }

      if (verificationStatus && verificationStatus !== 'all') {
        query.$or = [
          { farmerVerificationStatus: verificationStatus },
          { verificationStatus: verificationStatus },
        ];
      }

      if (search && search.trim()) {
        const term = search.trim();
        query.$or = [
          { name: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { village: { $regex: term, $options: 'i' } },
          { district: { $regex: term, $options: 'i' } },
          { state: { $regex: term, $options: 'i' } },
        ];
      }

      let sortOptions = { createdAt: -1 };
      if (sort === 'oldest') sortOptions = { createdAt: 1 };
      if (sort === 'name_asc') sortOptions = { name: 1 };
      if (sort === 'name_desc') sortOptions = { name: -1 };

      const [total, users] = await Promise.all([
        UserModel.countDocuments(query),
        UserModel.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      ]);

      const formatted = users.map((u) => ({
        id: u._id,
        name: u.name,
        phone: u.phone,
        email: u.email || '—',
        role: u.role,
        isActive: u.isActive,
        preferredLanguage: u.preferredLanguage || 'en',
        verificationStatus: u.farmerVerificationStatus || u.verificationStatus || '—',
        location: [u.village, u.district, u.state].filter(Boolean).join(', ') || '—',
        cropType: u.cropType || '—',
        landSizeAcres: u.landSizeAcres ?? '—',
        createdAt: u.createdAt,
      }));

      return res.json({
        users: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return res.status(500).json({ message: 'Unable to retrieve users list' });
    }
  });

  // 3. User Details: Get comprehensive user profile + requests/donations
  router.get('/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user identifier' });
      }

      const user = await UserModel.findById(id).lean();
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const [documents, requests, donations, auditLogs] = await Promise.all([
        DocumentModel.find({ farmerId: id }).lean().catch(() => []),
        AssistanceRequestModel.find({ farmerId: id }).sort({ createdAt: -1 }).lean().catch(() => []),
        DonationModel.find({ donorId: id })
          .populate('requestId', 'title amountRequested status')
          .sort({ createdAt: -1 })
          .lean()
          .catch(() => []),
        AuditLogModel.find({ $or: [{ actorId: id }, { targetId: id }] })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .catch(() => []),
      ]);

      return res.json({
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          preferredLanguage: user.preferredLanguage,
          verificationStatus: user.farmerVerificationStatus || user.verificationStatus,
          verificationRemarks: user.verificationRemarks,
          village: user.village,
          district: user.district,
          state: user.state,
          landSizeAcres: user.landSizeAcres,
          cropType: user.cropType,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        documents: documents.map((doc) => ({
          id: doc._id,
          documentType: doc.documentType,
          status: doc.status,
          originalName: doc.originalName,
          verifiedAt: doc.verifiedAt,
          notes: doc.verificationNotes || doc.rejectionReason,
        })),
        requests: requests.map((reqItem) => ({
          id: reqItem._id,
          title: reqItem.title || reqItem.purpose,
          category: reqItem.category,
          amountRequested: reqItem.amountRequested,
          amountFunded: reqItem.amountFunded,
          status: reqItem.status,
          createdAt: reqItem.createdAt,
        })),
        donations: donations.map((d) => ({
          id: d._id,
          amount: d.amount,
          status: d.status,
          orderId: d.razorpayOrderId,
          paymentId: d.razorpayPaymentId,
          requestTitle: d.requestId?.title || 'Assistance Request',
          createdAt: d.createdAt,
        })),
        auditLogs: auditLogs.map((log) => ({
          id: log._id,
          action: log.action,
          targetType: log.targetType,
          note: log.note,
          createdAt: log.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error fetching user detail:', error);
      return res.status(500).json({ message: 'Unable to retrieve user details' });
    }
  });

  // 4. Update User Active Status (Activate / Deactivate)
  router.patch('/users/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user identifier' });
      }

      const statusSchema = z.object({
        isActive: z.boolean(),
        reason: z.string().trim().optional(),
      });

      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'isActive boolean is required' });
      }

      const { isActive, reason } = parsed.data;

      // Prevent admin from deactivating their own account
      if (String(req.auth.userId) === String(id) && !isActive) {
        return res.status(400).json({ message: 'Administrators cannot deactivate their own account' });
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const previousStatus = user.isActive;
      user.isActive = isActive;
      await user.save();

      // Log action in AuditLog
      if (typeof AuditLogModel.create === 'function') {
        await AuditLogModel.create({
          actorId: req.auth.userId,
          action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          targetType: 'User',
          targetId: user._id,
          before: { isActive: previousStatus },
          after: { isActive },
          note: reason || `User account ${isActive ? 'activated' : 'deactivated'} by administrator`,
        }).catch(() => {});
      }

      return res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: user._id,
          name: user.name,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      return res.status(500).json({ message: 'Unable to update user status' });
    }
  });

  // 5. Update User Role
  router.patch('/users/:id/role', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user identifier' });
      }

      const roleSchema = z.object({
        role: z.enum(Object.values(ROLES)),
      });

      const parsed = roleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Valid role is required (admin, verifier, farmer, donor)' });
      }

      const { role } = parsed.data;

      // Prevent admin from demoting themselves
      if (String(req.auth.userId) === String(id) && role !== ROLES.ADMIN) {
        return res.status(400).json({ message: 'Administrators cannot revoke their own admin role' });
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const previousRole = user.role;
      user.role = role;
      await user.save();

      if (typeof AuditLogModel.create === 'function') {
        await AuditLogModel.create({
          actorId: req.auth.userId,
          action: 'USER_ROLE_CHANGED',
          targetType: 'User',
          targetId: user._id,
          before: { role: previousRole },
          after: { role },
          note: `User role changed from ${previousRole} to ${role} by administrator`,
        }).catch(() => {});
      }

      return res.json({
        success: true,
        message: `User role updated to ${role} successfully`,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Error changing user role:', error);
      return res.status(500).json({ message: 'Unable to change user role' });
    }
  });

  // 6. Assistance Requests Oversight: List all requests across platform
  router.get('/requests', async (req, res) => {
    try {
      const { status, category, search, page = '1', limit = '15', sort = 'newest' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
      const skip = (pageNum - 1) * limitNum;

      const query = {};
      if (status && status !== 'all' && Object.values(REQUEST_STATUS).includes(status)) {
        query.status = status;
      }
      if (category && category !== 'all') {
        query.category = category;
      }
      if (search && search.trim()) {
        const term = search.trim();
        query.$or = [
          { title: { $regex: term, $options: 'i' } },
          { purpose: { $regex: term, $options: 'i' } },
          { reason: { $regex: term, $options: 'i' } },
        ];
      }

      let sortOptions = { createdAt: -1 };
      if (sort === 'oldest') sortOptions = { createdAt: 1 };
      if (sort === 'amount_desc') sortOptions = { amountRequested: -1 };
      if (sort === 'amount_asc') sortOptions = { amountRequested: 1 };

      const [total, requests] = await Promise.all([
        AssistanceRequestModel.countDocuments(query),
        AssistanceRequestModel.find(query)
          .populate('farmerId', 'name phone village district state farmerVerificationStatus verificationStatus')
          .populate('reviewedBy', 'name role')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);

      const formatted = requests.map((item) => ({
        id: item._id,
        title: item.title || item.purpose || 'Agricultural Assistance Request',
        category: item.category || 'other',
        purpose: item.purpose || '',
        reason: item.reason || '',
        intendedUse: item.intendedUse || '',
        amountRequested: item.amountRequested || 0,
        amountFunded: item.amountFunded || 0,
        status: item.status,
        createdAt: item.createdAt,
        reviewedAt: item.reviewedAt,
        reviewedBy: item.reviewedBy ? { name: item.reviewedBy.name, role: item.reviewedBy.role } : null,
        reviewNotes: item.reviewNotes,
        rejectionReason: item.rejectionReason,
        farmer: item.farmerId
          ? {
              id: item.farmerId._id,
              name: item.farmerId.name,
              phone: item.farmerId.phone,
              location: [item.farmerId.village, item.farmerId.district, item.farmerId.state]
                .filter(Boolean)
                .join(', '),
              verificationStatus: item.farmerId.farmerVerificationStatus || item.farmerId.verificationStatus,
            }
          : null,
      }));

      return res.json({
        requests: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (error) {
      console.error('Error fetching admin requests:', error);
      return res.status(500).json({ message: 'Unable to retrieve assistance requests' });
    }
  });

  // 7. Request Status Override (Admin Action)
  router.patch('/requests/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid request identifier' });
      }

      const updateSchema = z.object({
        status: z.enum(Object.values(REQUEST_STATUS)),
        reviewNotes: z.string().trim().optional(),
        rejectionReason: z.string().trim().optional(),
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Invalid status update',
          errors: parsed.error.issues.map((i) => i.message),
        });
      }

      const { status, reviewNotes, rejectionReason } = parsed.data;

      const requestItem = await AssistanceRequestModel.findById(id);
      if (!requestItem) {
        return res.status(404).json({ message: 'Assistance request not found' });
      }

      const previousStatus = requestItem.status;
      requestItem.status = status;
      requestItem.reviewedBy = req.auth.userId;
      requestItem.reviewedAt = new Date();
      if (reviewNotes !== undefined) requestItem.reviewNotes = reviewNotes;
      if (rejectionReason !== undefined) requestItem.rejectionReason = rejectionReason;

      await requestItem.save();

      if (typeof AuditLogModel.create === 'function') {
        await AuditLogModel.create({
          actorId: req.auth.userId,
          action: 'ADMIN_REQUEST_STATUS_OVERRIDE',
          targetType: 'AssistanceRequest',
          targetId: requestItem._id,
          before: { status: previousStatus },
          after: { status, reviewNotes, rejectionReason },
          note: `Admin changed request status from ${previousStatus} to ${status}`,
        }).catch(() => {});
      }

      return res.json({
        success: true,
        message: `Request status updated to ${status} successfully`,
        request: {
          id: requestItem._id,
          status: requestItem.status,
          reviewedAt: requestItem.reviewedAt,
        },
      });
    } catch (error) {
      console.error('Error overriding request status:', error);
      return res.status(500).json({ message: 'Unable to update request status' });
    }
  });

  // 8. Donations & Payment Ledger
  router.get('/donations', async (req, res) => {
    try {
      const { status, search, page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }

      const [total, donations] = await Promise.all([
        DonationModel.countDocuments(query),
        DonationModel.find(query)
          .populate('donorId', 'name phone email')
          .populate({
            path: 'requestId',
            select: 'title purpose amountRequested farmerId',
            populate: { path: 'farmerId', select: 'name village district state' },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);

      const formatted = donations.map((d) => ({
        id: d._id,
        amount: d.amount,
        currency: d.currency || 'INR',
        status: d.status,
        razorpayOrderId: d.razorpayOrderId || '—',
        razorpayPaymentId: d.razorpayPaymentId || '—',
        notes: d.notes || '—',
        isAnonymous: d.isAnonymous,
        donor: d.donorId
          ? {
              id: d.donorId._id,
              name: d.isAnonymous ? 'Anonymous Donor' : d.donorId.name,
              phone: d.isAnonymous ? '—' : d.donorId.phone,
              email: d.isAnonymous ? '—' : d.donorId.email,
            }
          : {
              name: d.isAnonymous ? 'Anonymous' : (d.donorName || 'Guest Donor'),
              phone: d.isAnonymous ? '—' : (d.donorPhone || '—'),
              email: d.isAnonymous ? '—' : (d.donorEmail || '—'),
            },
        request: d.requestId
          ? {
              id: d.requestId._id,
              title: d.requestId.title || d.requestId.purpose,
              amountRequested: d.requestId.amountRequested,
              farmerName: d.requestId.farmerId?.name,
              farmerLocation: [
                d.requestId.farmerId?.village,
                d.requestId.farmerId?.district,
                d.requestId.farmerId?.state,
              ]
                .filter(Boolean)
                .join(', '),
            }
          : null,
        createdAt: d.createdAt,
      }));

      return res.json({
        donations: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (error) {
      console.error('Error fetching admin donations ledger:', error);
      return res.status(500).json({ message: 'Unable to retrieve donations ledger' });
    }
  });

  // 9. System Audit Logs
  router.get('/audit-logs', async (req, res) => {
    try {
      const { targetType, action, page = '1', limit = '25' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
      const skip = (pageNum - 1) * limitNum;

      const query = {};
      if (targetType && targetType !== 'all') {
        query.targetType = targetType;
      }
      if (action && action !== 'all') {
        query.action = action;
      }

      const [total, logs] = await Promise.all([
        AuditLogModel.countDocuments(query),
        AuditLogModel.find(query)
          .populate('actorId', 'name email role phone')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);

      const formatted = logs.map((log) => ({
        id: log._id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        actor: log.actorId
          ? {
              id: log.actorId._id,
              name: log.actorId.name,
              role: log.actorId.role,
              email: log.actorId.email,
            }
          : null,
        before: log.before,
        after: log.after,
        note: log.note || '—',
        createdAt: log.createdAt,
      }));

      return res.json({
        logs: formatted,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ message: 'Unable to retrieve audit logs' });
    }
  });

  return router;
}

export default createAdminRouter();
