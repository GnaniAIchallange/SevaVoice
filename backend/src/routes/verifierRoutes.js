import { Router } from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { AssistanceRequest, AuditLog, Document, User } from '../models/index.js';
import { DOCUMENT_STATUS, REQUEST_STATUS, ROLES, VERIFICATION_STATUS } from '../utils/constants.js';

const PRIVATE_UPLOAD_DIRECTORY = path.resolve(
  process.env.PRIVATE_UPLOAD_DIR ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../private-uploads'),
);

function requireVerifierOrAdmin(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.auth.role !== ROLES.VERIFIER && req.auth.role !== ROLES.ADMIN) {
    return res.status(403).json({ message: 'Access denied: Verifier permissions required' });
  }
  return next();
}

const documentReviewSchema = z.object({
  status: z.enum([DOCUMENT_STATUS.VERIFIED, DOCUMENT_STATUS.REJECTED, DOCUMENT_STATUS.NEEDS_REPLACEMENT]),
  reason: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
}).refine(
  (data) => {
    if ((data.status === DOCUMENT_STATUS.REJECTED || data.status === DOCUMENT_STATUS.NEEDS_REPLACEMENT) && !data.reason && !data.remarks) {
      return false;
    }
    return true;
  },
  { message: 'A reason is required when rejecting a document or requesting replacement' }
);

const farmerVerificationSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_info', 'under_review']),
  reason: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
}).refine(
  (data) => {
    if ((data.action === 'reject' || data.action === 'request_info') && !data.reason && !data.remarks) {
      return false;
    }
    return true;
  },
  { message: 'A reason is required when rejecting or requesting additional information' }
);

const requestReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_info', 'under_review', 'close']),
  reason: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
}).refine(
  (data) => {
    if ((data.action === 'reject' || data.action === 'request_info') && !data.reason && !data.remarks) {
      return false;
    }
    return true;
  },
  { message: 'A reason is required when rejecting or requesting additional information' }
);

export function createVerifierRouter({
  UserModel = User,
  DocumentModel = Document,
  AssistanceRequestModel = AssistanceRequest,
  AuditLogModel = AuditLog,
  storageDirectory = PRIVATE_UPLOAD_DIRECTORY,
} = {}) {
  const router = Router();

  // All verifier routes require authentication and verifier or admin role
  router.use(authenticateToken);
  router.use(requireVerifierOrAdmin);

  // Overview statistics calculated from actual MongoDB records
  router.get('/stats', async (_req, res) => {
    try {
      const [
        pendingReviews,
        underReview,
        additionalInfoRequired,
        verified,
        rejected,
        requestsPending,
        requestsUnderReview,
        requestsAdditionalInfo,
        requestsApproved,
        requestsRejected,
      ] = await Promise.all([
        UserModel.countDocuments({ role: ROLES.FARMER, farmerVerificationStatus: 'pending' }),
        UserModel.countDocuments({ role: ROLES.FARMER, farmerVerificationStatus: 'under_review' }),
        UserModel.countDocuments({ role: ROLES.FARMER, farmerVerificationStatus: 'additional_information_required' }),
        UserModel.countDocuments({ role: ROLES.FARMER, farmerVerificationStatus: 'verified' }),
        UserModel.countDocuments({ role: ROLES.FARMER, farmerVerificationStatus: 'rejected' }),
        AssistanceRequestModel.countDocuments({ status: { $in: [REQUEST_STATUS.SUBMITTED, 'pending_approval', REQUEST_STATUS.DRAFT] } }),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.UNDER_REVIEW }),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.ADDITIONAL_INFO_REQUIRED }),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.APPROVED }),
        AssistanceRequestModel.countDocuments({ status: REQUEST_STATUS.REJECTED }),
      ]);

      return res.json({
        farmerVerification: {
          pendingReviews,
          underReview,
          additionalInfoRequired,
          verified,
          rejected,
          total: pendingReviews + underReview + additionalInfoRequired + verified + rejected,
        },
        assistanceRequests: {
          requestsPending,
          requestsUnderReview,
          requestsAdditionalInfo,
          requestsApproved,
          requestsRejected,
          total: requestsPending + requestsUnderReview + requestsAdditionalInfo + requestsApproved + requestsRejected,
        },
      });
    } catch (error) {
      console.error('Error fetching verifier stats:', error);
      return res.status(500).json({ message: 'Unable to calculate dashboard statistics' });
    }
  });

  // Farmer verification queue with search, filter, and pagination
  router.get('/farmers', async (req, res) => {
    try {
      const { status, search, page = '1', limit = '10' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      const filter = { role: ROLES.FARMER };

      if (status && status !== 'all') {
        filter.farmerVerificationStatus = status;
      }

      if (search && search.trim()) {
        const term = search.trim();
        filter.$or = [
          { name: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
          { village: { $regex: term, $options: 'i' } },
          { district: { $regex: term, $options: 'i' } },
          { state: { $regex: term, $options: 'i' } },
        ];
      }

      const [total, farmers] = await Promise.all([
        UserModel.countDocuments(filter),
        UserModel.find(filter)
          .select('-passwordHash -farmerRegistrationKey')
          .populate('verificationAssignedTo', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);

      const items = farmers.map((farmer) => ({
        id: farmer._id,
        name: farmer.name,
        phone: farmer.phone, // Authorized verifier access
        email: farmer.email,
        village: farmer.village,
        district: farmer.district,
        state: farmer.state,
        landSizeAcres: farmer.landSizeAcres,
        cropType: farmer.cropType,
        preferredLanguage: farmer.preferredLanguage,
        farmerVerificationStatus: farmer.farmerVerificationStatus ?? 'pending',
        verificationStatus: farmer.verificationStatus ?? 'pending',
        verificationSubmittedAt: farmer.verificationSubmittedAt || farmer.createdAt,
        verifiedAt: farmer.verifiedAt,
        verificationRemarks: farmer.verificationRemarks,
        assignedTo: farmer.verificationAssignedTo,
        documentsCount: Array.isArray(farmer.documents) ? farmer.documents.length : 0,
        createdAt: farmer.createdAt,
      }));

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
      console.error('Error fetching farmer queue:', error);
      return res.status(500).json({ message: 'Unable to retrieve farmers queue' });
    }
  });

  // Single farmer details for document review
  router.get('/farmers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid farmer identifier' });
      }

      const farmer = await UserModel.findOne({ _id: id, role: ROLES.FARMER })
        .select('-passwordHash -farmerRegistrationKey')
        .populate('verificationAssignedTo', 'name email')
        .populate({
          path: 'documents',
          populate: { path: 'verifiedBy', select: 'name' },
        })
        .lean();

      if (!farmer) {
        return res.status(404).json({ message: 'Farmer record not found' });
      }

      // Also query Document collection directly in case farmer.documents reference list has any unlinked records
      const allDocs = await DocumentModel.find({ ownerId: farmer._id })
        .populate('verifiedBy', 'name')
        .lean();

      const mergedDocsMap = new Map();
      for (const doc of [...(farmer.documents || []), ...allDocs]) {
        mergedDocsMap.set(String(doc._id), doc);
      }
      const documents = Array.from(mergedDocsMap.values());

      const aadhaarDoc = documents.find((d) => d.type === 'aadhaar') || null;
      const landDoc = documents.find((d) => d.type === 'land_certificate') || null;
      const supportingDocs = documents.filter((d) => d.type !== 'aadhaar' && d.type !== 'land_certificate');

      // Check if both mandatory documents are approved
      const canVerify =
        aadhaarDoc?.verificationStatus === DOCUMENT_STATUS.VERIFIED &&
        landDoc?.verificationStatus === DOCUMENT_STATUS.VERIFIED;

      return res.json({
        farmer: {
          id: farmer._id,
          name: farmer.name,
          phone: farmer.phone,
          email: farmer.email,
          village: farmer.village,
          district: farmer.district,
          state: farmer.state,
          landSizeAcres: farmer.landSizeAcres,
          cropType: farmer.cropType,
          preferredLanguage: farmer.preferredLanguage,
          farmerVerificationStatus: farmer.farmerVerificationStatus ?? 'pending',
          verificationStatus: farmer.verificationStatus ?? 'pending',
          verificationSubmittedAt: farmer.verificationSubmittedAt || farmer.createdAt,
          verifiedAt: farmer.verifiedAt,
          verificationRemarks: farmer.verificationRemarks,
          assignedTo: farmer.verificationAssignedTo,
          createdAt: farmer.createdAt,
        },
        mandatoryDocuments: {
          aadhaar: aadhaarDoc,
          landCertificate: landDoc,
        },
        supportingDocuments: supportingDocs,
        allDocuments: documents,
        canVerify,
      });
    } catch (error) {
      console.error('Error fetching farmer review record:', error);
      return res.status(500).json({ message: 'Unable to retrieve farmer review details' });
    }
  });

  // Secure document file streaming / view (authorized access only)
  router.get('/documents/:id/file', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid document identifier' });
      }

      const document = await DocumentModel.findById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Security: ensure the storageKey does not contain directory traversal characters
      const safeFilename = path.basename(document.storageKey);
      const filePath = path.join(storageDirectory, safeFilename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Physical document file not found on server' });
      }

      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${document.type}-${safeFilename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');

      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error streaming document:', error);
      return res.status(500).json({ message: 'Unable to retrieve document file' });
    }
  });

  // Review an individual document (Approve, Reject, Request Replacement, Add Remark)
  router.patch('/documents/:id/review', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid document identifier' });
      }

      const parseResult = documentReviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: parseResult.error.issues[0]?.message || 'Invalid document review data',
        });
      }

      const { status, reason, remarks } = parseResult.data;

      const document = await DocumentModel.findById(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      const previousStatus = document.verificationStatus;
      document.verificationStatus = status;
      document.verifiedBy = req.auth.userId;
      document.verifiedAt = new Date();
      document.rejectionReason = reason || remarks || '';
      document.remarks = remarks || reason || '';

      await document.save();

      // Log review decision in AuditLog
      await AuditLogModel.create({
        actorId: req.auth.userId,
        action: 'REVIEW_DOCUMENT',
        targetType: 'Document',
        targetId: document._id,
        before: { verificationStatus: previousStatus },
        after: { verificationStatus: status, remarks: document.remarks },
        note: reason || remarks,
      });

      return res.json({
        message: 'Document review updated successfully',
        document,
      });
    } catch (error) {
      console.error('Error reviewing document:', error);
      return res.status(500).json({ message: 'Unable to update document review status' });
    }
  });

  // Final farmer verification decision (Approve, Reject, Request Info, Under Review)
  router.patch('/farmers/:id/verify', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid farmer identifier' });
      }

      const parseResult = farmerVerificationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: parseResult.error.issues[0]?.message || 'Invalid verification request',
        });
      }

      const { action, reason, remarks } = parseResult.data;

      const farmer = await UserModel.findOne({ _id: id, role: ROLES.FARMER });
      if (!farmer) {
        return res.status(404).json({ message: 'Farmer not found' });
      }

      const beforeStatus = {
        farmerVerificationStatus: farmer.farmerVerificationStatus,
        verificationStatus: farmer.verificationStatus,
      };

      if (action === 'approve') {
        // Enforce mandatory rule: both Aadhaar and Land Certificate must be approved
        const docs = await DocumentModel.find({ ownerId: farmer._id });
        const aadhaarApproved = docs.some(
          (d) => d.type === 'aadhaar' && d.verificationStatus === DOCUMENT_STATUS.VERIFIED
        );
        const landApproved = docs.some(
          (d) => d.type === 'land_certificate' && d.verificationStatus === DOCUMENT_STATUS.VERIFIED
        );

        if (!aadhaarApproved || !landApproved) {
          return res.status(400).json({
            message:
              'A farmer can be marked verified only after both mandatory documents (Aadhaar card and Land Certificate) have been reviewed and approved.',
          });
        }

        farmer.farmerVerificationStatus = 'verified';
        farmer.verificationStatus = VERIFICATION_STATUS.VERIFIED;
        farmer.verifiedAt = new Date();
        farmer.verificationAssignedTo = req.auth.userId;
        farmer.verificationRemarks = remarks || 'Approved by verifier';
      } else if (action === 'reject') {
        farmer.farmerVerificationStatus = 'rejected';
        farmer.verificationStatus = VERIFICATION_STATUS.REJECTED;
        farmer.verificationAssignedTo = req.auth.userId;
        farmer.verificationRemarks = reason || remarks || 'Verification rejected';
      } else if (action === 'request_info') {
        farmer.farmerVerificationStatus = 'additional_information_required';
        farmer.verificationAssignedTo = req.auth.userId;
        farmer.verificationRemarks = reason || remarks || 'Additional information required';
      } else if (action === 'under_review') {
        farmer.farmerVerificationStatus = 'under_review';
        farmer.verificationAssignedTo = req.auth.userId;
      }

      await farmer.save();

      await AuditLogModel.create({
        actorId: req.auth.userId,
        action: `FARMER_VERIFICATION_${action.toUpperCase()}`,
        targetType: 'User',
        targetId: farmer._id,
        before: beforeStatus,
        after: {
          farmerVerificationStatus: farmer.farmerVerificationStatus,
          verificationStatus: farmer.verificationStatus,
        },
        note: reason || remarks,
      });

      return res.json({
        message: `Farmer verification updated to ${farmer.farmerVerificationStatus}`,
        farmer: {
          id: farmer._id,
          name: farmer.name,
          farmerVerificationStatus: farmer.farmerVerificationStatus,
          verificationStatus: farmer.verificationStatus,
          verifiedAt: farmer.verifiedAt,
          verificationRemarks: farmer.verificationRemarks,
        },
      });
    } catch (error) {
      console.error('Error verifying farmer:', error);
      return res.status(500).json({ message: 'Unable to update farmer verification status' });
    }
  });

  // Assistance requests queue for verifier review
  router.get('/requests', async (req, res) => {
    try {
      const { status, category, search, page = '1', limit = '10' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      const filter = {};

      if (status && status !== 'all') {
        if (status === 'pending_approval' || status === 'submitted') {
          filter.status = { $in: [REQUEST_STATUS.SUBMITTED, 'pending_approval', REQUEST_STATUS.DRAFT] };
        } else {
          filter.status = status;
        }
      }

      if (category && category !== 'all') {
        filter.category = category;
      }

      if (search && search.trim()) {
        const term = search.trim();
        filter.$or = [
          { title: { $regex: term, $options: 'i' } },
          { purpose: { $regex: term, $options: 'i' } },
          { reason: { $regex: term, $options: 'i' } },
        ];
      }

      const [total, rawRequests] = await Promise.all([
        AssistanceRequestModel.countDocuments(filter),
        AssistanceRequestModel.find(filter)
          .populate('farmerId', 'name village district state phone farmerVerificationStatus verificationStatus landSizeAcres cropType')
          .populate('reviewedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);

      const items = rawRequests.map((reqItem) => {
        const farmer = reqItem.farmerId || {};
        const isFarmerVerified = farmer.farmerVerificationStatus === 'verified' || farmer.verificationStatus === 'verified';

        return {
          id: reqItem._id,
          title: reqItem.title || reqItem.purpose || 'Agricultural Assistance Request',
          category: reqItem.category || 'other',
          amountRequested: reqItem.amountRequested || 0,
          amountFunded: reqItem.amountFunded || 0,
          purpose: reqItem.purpose || reqItem.reason || '',
          reason: reqItem.reason || reqItem.purpose || '',
          intendedUse: reqItem.intendedUse || reqItem.purpose || '',
          status: reqItem.status,
          createdAt: reqItem.createdAt,
          reviewedAt: reqItem.reviewedAt,
          reviewNotes: reqItem.reviewNotes,
          rejectionReason: reqItem.rejectionReason,
          reviewedBy: reqItem.reviewedBy,
          isEligibleForPublication: isFarmerVerified,
          ineligibilityReason: !isFarmerVerified ? 'Farmer document verification is not completed or verified' : null,
          farmer: {
            id: farmer._id,
            name: farmer.name,
            phone: farmer.phone,
            village: farmer.village,
            district: farmer.district,
            state: farmer.state,
            cropType: farmer.cropType,
            landSizeAcres: farmer.landSizeAcres,
            farmerVerificationStatus: farmer.farmerVerificationStatus || 'pending',
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
      console.error('Error fetching assistance requests:', error);
      return res.status(500).json({ message: 'Unable to retrieve assistance requests' });
    }
  });

  // Specific assistance request details for review
  router.get('/requests/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid request identifier' });
      }

      const requestItem = await AssistanceRequestModel.findById(id)
        .populate('farmerId', 'name phone email village district state cropType landSizeAcres farmerVerificationStatus verificationStatus createdAt verifiedAt')
        .populate('reviewedBy', 'name email')
        .lean();

      if (!requestItem) {
        return res.status(404).json({ message: 'Assistance request not found' });
      }

      const farmer = requestItem.farmerId || {};
      const isFarmerVerified = farmer.farmerVerificationStatus === 'verified' || farmer.verificationStatus === 'verified';

      // Check for farmer's previous requests count
      const previousRequestsCount = await AssistanceRequestModel.countDocuments({
        farmerId: farmer._id,
        _id: { $ne: requestItem._id },
      });

      return res.json({
        request: {
          id: requestItem._id,
          title: requestItem.title || requestItem.purpose || 'Agricultural Assistance Request',
          category: requestItem.category || 'other',
          amountRequested: requestItem.amountRequested || 0,
          amountFunded: requestItem.amountFunded || 0,
          purpose: requestItem.purpose || '',
          reason: requestItem.reason || requestItem.purpose || '',
          intendedUse: requestItem.intendedUse || requestItem.purpose || '',
          supportingEvidence: requestItem.supportingEvidence || [],
          status: requestItem.status,
          createdAt: requestItem.createdAt,
          reviewedAt: requestItem.reviewedAt,
          reviewNotes: requestItem.reviewNotes,
          rejectionReason: requestItem.rejectionReason,
          reviewedBy: requestItem.reviewedBy,
          isEligibleForPublication: isFarmerVerified,
          ineligibilityReason: !isFarmerVerified ? 'Farmer document verification is pending or rejected' : null,
        },
        farmer: {
          id: farmer._id,
          name: farmer.name,
          phone: farmer.phone,
          email: farmer.email,
          village: farmer.village,
          district: farmer.district,
          state: farmer.state,
          cropType: farmer.cropType,
          landSizeAcres: farmer.landSizeAcres,
          farmerVerificationStatus: farmer.farmerVerificationStatus,
          verifiedAt: farmer.verifiedAt,
          registrationDate: farmer.createdAt,
          previousRequestsCount,
        },
      });
    } catch (error) {
      console.error('Error fetching request review record:', error);
      return res.status(500).json({ message: 'Unable to retrieve assistance request details' });
    }
  });

  // Approve, Reject, Request Info, Under Review, or Close an assistance request
  router.patch('/requests/:id/review', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid request identifier' });
      }

      const parseResult = requestReviewSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: parseResult.error.issues[0]?.message || 'Invalid review decision',
        });
      }

      const { action, reason, remarks } = parseResult.data;

      const requestItem = await AssistanceRequestModel.findById(id).populate('farmerId');
      if (!requestItem) {
        return res.status(404).json({ message: 'Assistance request not found' });
      }

      const farmer = requestItem.farmerId;
      const isFarmerVerified =
        farmer &&
        (farmer.farmerVerificationStatus === 'verified' || farmer.verificationStatus === 'verified');

      const beforeStatus = requestItem.status;

      if (action === 'approve') {
        if (!isFarmerVerified) {
          return res.status(400).json({
            message:
              'Cannot approve this request for publication. Only assistance requests from verified farmers may be published to donors.',
          });
        }
        requestItem.status = REQUEST_STATUS.APPROVED;
        requestItem.reviewedBy = req.auth.userId;
        requestItem.reviewedAt = new Date();
        requestItem.reviewNotes = remarks || 'Approved for publication on donor platform';
      } else if (action === 'reject') {
        requestItem.status = REQUEST_STATUS.REJECTED;
        requestItem.reviewedBy = req.auth.userId;
        requestItem.reviewedAt = new Date();
        requestItem.reviewNotes = reason || remarks || 'Request rejected';
        requestItem.rejectionReason = reason || remarks || 'Request rejected';
      } else if (action === 'request_info') {
        requestItem.status = REQUEST_STATUS.ADDITIONAL_INFO_REQUIRED;
        requestItem.reviewedBy = req.auth.userId;
        requestItem.reviewedAt = new Date();
        requestItem.reviewNotes = reason || remarks || 'Additional information required';
      } else if (action === 'under_review') {
        requestItem.status = REQUEST_STATUS.UNDER_REVIEW;
        requestItem.reviewedBy = req.auth.userId;
        requestItem.reviewedAt = new Date();
      } else if (action === 'close') {
        requestItem.status = REQUEST_STATUS.CLOSED;
        requestItem.reviewedBy = req.auth.userId;
        requestItem.reviewedAt = new Date();
        requestItem.reviewNotes = remarks || 'Request closed';
      }

      await requestItem.save();

      await AuditLogModel.create({
        actorId: req.auth.userId,
        action: `REQUEST_REVIEW_${action.toUpperCase()}`,
        targetType: 'AssistanceRequest',
        targetId: requestItem._id,
        before: { status: beforeStatus },
        after: { status: requestItem.status, reviewNotes: requestItem.reviewNotes },
        note: reason || remarks,
      });

      return res.json({
        message: `Assistance request updated to ${requestItem.status}`,
        request: {
          id: requestItem._id,
          status: requestItem.status,
          reviewedAt: requestItem.reviewedAt,
          reviewNotes: requestItem.reviewNotes,
        },
      });
    } catch (error) {
      console.error('Error updating request review status:', error);
      return res.status(500).json({ message: 'Unable to update assistance request review status' });
    }
  });

  // Farmer Profile and Previous Donation Requests History
  router.get('/farmers/:id/profile', async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid farmer identifier' });
      }

      const farmer = await UserModel.findOne({ _id: id, role: ROLES.FARMER })
        .select('-passwordHash -farmerRegistrationKey')
        .populate('verificationAssignedTo', 'name email')
        .lean();

      if (!farmer) {
        return res.status(404).json({ message: 'Farmer not found' });
      }

      const { page = '1', limit = '10' } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      const [totalRequests, requests] = await Promise.all([
        AssistanceRequestModel.countDocuments({ farmerId: farmer._id }),
        AssistanceRequestModel.find({ farmerId: farmer._id })
          .populate('reviewedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);

      const formattedRequests = requests.map((item) => ({
        id: item._id,
        title: item.title || item.purpose || 'Agricultural Assistance Request',
        reason: item.reason || item.purpose || '',
        intendedUse: item.intendedUse || item.purpose || '',
        category: item.category || 'other',
        amountRequested: item.amountRequested || 0,
        amountFunded: item.amountFunded || 0,
        status: item.status,
        createdAt: item.createdAt,
        reviewedAt: item.reviewedAt,
        reviewedBy: item.reviewedBy ? { name: item.reviewedBy.name, email: item.reviewedBy.email } : null,
        reviewNotes: item.reviewNotes,
        rejectionReason: item.rejectionReason,
      }));

      return res.json({
        farmer: {
          id: farmer._id,
          name: farmer.name,
          phone: farmer.phone,
          email: farmer.email,
          village: farmer.village,
          district: farmer.district,
          state: farmer.state,
          landSizeAcres: farmer.landSizeAcres,
          cropType: farmer.cropType,
          preferredLanguage: farmer.preferredLanguage,
          farmerVerificationStatus: farmer.farmerVerificationStatus ?? 'pending',
          verificationStatus: farmer.verificationStatus ?? 'pending',
          verifiedAt: farmer.verifiedAt,
          verificationRemarks: farmer.verificationRemarks,
          assignedTo: farmer.verificationAssignedTo,
          registrationDate: farmer.createdAt,
        },
        requests: formattedRequests,
        pagination: {
          total: totalRequests,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalRequests / limitNum) || 1,
        },
      });
    } catch (error) {
      console.error('Error fetching farmer profile history:', error);
      return res.status(500).json({ message: 'Unable to retrieve farmer profile and history' });
    }
  });

  return router;
}

export default createVerifierRouter();
