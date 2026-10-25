import { Router } from "express";
import { randomUUID } from "node:crypto";
import { chmod, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { z } from "zod";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { AssistanceRequest, Document, Donation, User } from "../models/index.js";
import { extractAssistanceRequest } from "../services/requestExtractor.js";
import {
  DOCUMENT_STATUS,
  LANGUAGES,
  REQUEST_CATEGORIES,
  REQUEST_STATUS,
  ROLES,
} from "../utils/constants.js";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const PRIVATE_UPLOAD_DIRECTORY = path.resolve(
  process.env.PRIVATE_UPLOAD_DIR ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../../private-uploads"),
);
const ALLOWED_FILES = new Map([
  [".pdf", "application/pdf"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
]);

function isSupportedFile(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return ALLOWED_FILES.get(extension) === file.mimetype;
}

async function matchesFileSignature(file) {
  const handle = await open(file.path, "r");
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    switch (file.mimetype) {
      case "application/pdf":
        return signature.subarray(0, 5).toString() === "%PDF-";
      case "image/jpeg":
        return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
      case "image/png":
        return signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      default:
        return false;
    }
  } finally {
    await handle.close();
  }
}

function createReuploadMiddleware(storageDirectory) {
  const storage = multer.diskStorage({
    destination(_req, _file, callback) {
      mkdir(storageDirectory, { recursive: true, mode: 0o700 })
        .then(() => callback(null, storageDirectory))
        .catch(callback);
    },
    filename(_req, file, callback) {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter(_req, file, callback) {
      if (!isSupportedFile(file)) {
        const error = new Error("Use a PDF, JPG, JPEG, or PNG file");
        error.status = 400;
        callback(error);
        return;
      }
      callback(null, true);
    },
  }).single("document");
}

/**
 * Middleware ensuring the authenticated user has the 'farmer' role.
 */
function requireFarmerRole(req, res, next) {
  if (req.auth?.role !== ROLES.FARMER) {
    return res.status(403).json({ message: "Access restricted to farmers" });
  }
  return next();
}

/**
 * Strips private document data (storageKey, file paths) before sending to farmer.
 */
function sanitizeDocument(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id || doc.id),
    type: doc.type,
    mimeType: doc.mimeType,
    size: doc.size,
    verificationStatus: doc.verificationStatus,
    rejectionReason: doc.rejectionReason || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function createFarmerWorkspaceRouter({
  UserModel = User,
  DocumentModel = Document,
  AssistanceRequestModel = AssistanceRequest,
  DonationModel = Donation,
  storageDirectory = PRIVATE_UPLOAD_DIRECTORY,
} = {}) {
  const router = Router();
  const uploadSingle = createReuploadMiddleware(storageDirectory);

  // All endpoints require authentication and farmer role
  router.use(authenticateToken, requireFarmerRole);

  /**
   * GET /dashboard
   * Aggregates farmer status, documents summary, and recent requests.
   */
  router.get("/dashboard", async (req, res) => {
    try {
      const farmerId = req.auth.userId;
      const user = await UserModel.findById(farmerId);
      if (!user) {
        return res.status(404).json({ message: "Farmer account not found" });
      }

      // Fetch active documents for this farmer
      const rawDocs = await DocumentModel.find({ ownerId: farmerId, replacedBy: null }).sort({ createdAt: -1 });
      const documents = rawDocs.map(sanitizeDocument);

      const hasRejectedDocument = documents.some((d) => d.verificationStatus === DOCUMENT_STATUS.REJECTED);
      const isVerified = user.farmerVerificationStatus === "verified" || user.verificationStatus === "verified";

      let cannotRequestReason = null;
      if (!isVerified) {
        if (hasRejectedDocument) {
          cannotRequestReason = "One or more documents were rejected. Please re-upload them to proceed.";
        } else if (user.farmerVerificationStatus === "under_review" || user.farmerVerificationStatus === "pending") {
          cannotRequestReason = "Your account is awaiting human verification. You will be able to request help once verified.";
        } else if (user.farmerVerificationStatus === "additional_information_required") {
          cannotRequestReason = "Additional information or document correction is required by our verification team.";
        } else if (user.farmerVerificationStatus === "rejected") {
          cannotRequestReason = user.verificationRemarks || "Your verification was rejected. Please review your documents or contact support.";
        } else {
          cannotRequestReason = "Verification is required before requesting financial assistance.";
        }
      }

      // Fetch 3 most recent requests
      const recentReqs = await AssistanceRequestModel.find({ farmerId })
        .sort({ updatedAt: -1 })
        .limit(5);

      const requestsWithDonors = await Promise.all(
        recentReqs.map(async (item) => {
          const donorCount = await DonationModel.countDocuments({ requestId: item._id });
          const amountRequested = item.amountRequested || 0;
          const amountFunded = item.amountFunded || 0;
          const fundingPercentage = amountRequested > 0 ? Math.min(100, Math.round((amountFunded / amountRequested) * 100)) : 0;

          return {
            id: String(item._id || item.id),
            category: item.category,
            amountRequested,
            amountFunded,
            fundingPercentage,
            status: item.status,
            purpose: item.purpose,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            donorCount,
          };
        }),
      );

      // Check for any active draft
      const activeDraftDoc = await AssistanceRequestModel.findOne({
        farmerId,
        status: REQUEST_STATUS.DRAFT,
      }).sort({ updatedAt: -1 });

      const activeDraft = activeDraftDoc
        ? {
            id: String(activeDraftDoc._id),
            category: activeDraftDoc.category,
            amountRequested: activeDraftDoc.amountRequested,
            purpose: activeDraftDoc.purpose,
            extractedFields: activeDraftDoc.extractedFields,
            updatedAt: activeDraftDoc.updatedAt,
          }
        : null;

      return res.json({
        farmer: {
          id: String(user._id),
          name: user.name,
          phone: user.phone,
          email: user.email,
          village: user.village,
          district: user.district,
          state: user.state,
          landSizeAcres: user.landSizeAcres,
          cropType: user.cropType,
          preferredLanguage: user.preferredLanguage,
          farmerVerificationStatus: user.farmerVerificationStatus,
          verificationStatus: user.verificationStatus,
          verificationRemarks: user.verificationRemarks,
        },
        documents,
        hasRejectedDocument,
        canRequestHelp: isVerified,
        cannotRequestReason,
        recentRequests: requestsWithDonors,
        activeDraft,
      });
    } catch (error) {
      console.error("Farmer dashboard error:", error);
      return res.status(500).json({ message: "Unable to load dashboard details" });
    }
  });

  /**
   * GET /requests
   * Lists all requests for this farmer with optional status filter.
   */
  router.get("/requests", async (req, res) => {
    try {
      const farmerId = req.auth.userId;
      const { status } = req.query;

      const query = { farmerId };
      if (status && status !== "all" && Object.values(REQUEST_STATUS).includes(status)) {
        query.status = status;
      }

      const requests = await AssistanceRequestModel.find(query).sort({ updatedAt: -1 });

      const enriched = await Promise.all(
        requests.map(async (item) => {
          const donorCount = await DonationModel.countDocuments({ requestId: item._id });
          const amountRequested = item.amountRequested || 0;
          const amountFunded = item.amountFunded || 0;
          const fundingPercentage = amountRequested > 0 ? Math.min(100, Math.round((amountFunded / amountRequested) * 100)) : 0;

          return {
            id: String(item._id),
            category: item.category,
            amountRequested,
            amountFunded,
            fundingPercentage,
            status: item.status,
            purpose: item.purpose,
            language: item.language,
            transcript: item.transcript,
            reviewNotes: item.reviewNotes,
            reviewedAt: item.reviewedAt,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            donorCount,
          };
        }),
      );

      return res.json({ requests: enriched });
    } catch (error) {
      console.error("List farmer requests error:", error);
      return res.status(500).json({ message: "Unable to load requests" });
    }
  });

  /**
   * GET /requests/:id
   * Detail view for a specific request. Never leaks donor identities.
   */
  router.get("/requests/:id", async (req, res) => {
    try {
      const farmerId = req.auth.userId;
      const request = await AssistanceRequestModel.findOne({
        _id: req.params.id,
        farmerId,
      });

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      const donorCount = await DonationModel.countDocuments({ requestId: request._id });
      const amountRequested = request.amountRequested || 0;
      const amountFunded = request.amountFunded || 0;
      const fundingPercentage = amountRequested > 0 ? Math.min(100, Math.round((amountFunded / amountRequested) * 100)) : 0;

      return res.json({
        request: {
          id: String(request._id),
          category: request.category,
          amountRequested,
          amountFunded,
          fundingPercentage,
          status: request.status,
          purpose: request.purpose,
          language: request.language,
          transcript: request.transcript,
          extractedFields: request.extractedFields,
          reviewNotes: request.reviewNotes,
          reviewedAt: request.reviewedAt,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          donorCount,
        },
      });
    } catch (error) {
      console.error("Get request detail error:", error);
      return res.status(500).json({ message: "Unable to load request details" });
    }
  });

  /**
   * POST /requests/draft
   * Autosaves draft progress server-side.
   */
  router.post("/requests/draft", async (req, res) => {
    try {
      const farmerId = req.auth.userId;
      const { requestId, category, amountRequested, purpose, urgency, transcript, extractedFields, language } = req.body;

      let draft;
      if (requestId) {
        draft = await AssistanceRequestModel.findOne({ _id: requestId, farmerId, status: REQUEST_STATUS.DRAFT });
      }

      const numericAmount = Number(amountRequested);
      const updateData = {
        category: REQUEST_CATEGORIES.includes(category) ? category : undefined,
        amountRequested: !isNaN(numericAmount) && numericAmount > 0 ? numericAmount : undefined,
        purpose: purpose ? String(purpose).trim() : undefined,
        language: LANGUAGES.includes(language) ? language : undefined,
        transcript: transcript ? String(transcript).trim() : undefined,
        extractedFields: {
          ...(extractedFields || {}),
          urgency: urgency || extractedFields?.urgency || "standard",
        },
      };

      if (draft) {
        Object.assign(draft, updateData);
        await draft.save();
      } else {
        draft = await AssistanceRequestModel.create({
          farmerId,
          status: REQUEST_STATUS.DRAFT,
          ...updateData,
        });
      }

      return res.json({
        request: {
          id: String(draft._id),
          category: draft.category,
          amountRequested: draft.amountRequested,
          purpose: draft.purpose,
          status: draft.status,
          extractedFields: draft.extractedFields,
          updatedAt: draft.updatedAt,
        },
        message: "Draft saved",
      });
    } catch (error) {
      console.error("Draft save error:", error);
      return res.status(500).json({ message: "Unable to save draft" });
    }
  });

  /**
   * POST /requests
   * Submits a request for human review.
   * GATED by farmerVerificationStatus === 'verified' (frontend + backend).
   */
  router.post("/requests", async (req, res) => {
    try {
      const farmerId = req.auth.userId;
      const user = await UserModel.findById(farmerId);
      if (!user) {
        return res.status(404).json({ message: "Farmer account not found" });
      }

      // STRICT VERIFICATION GATING
      if (user.farmerVerificationStatus !== "verified" && user.verificationStatus !== "verified") {
        return res.status(403).json({
          message: "Account verification required before submitting assistance requests.",
        });
      }

      const { requestId, category, amountRequested, purpose, urgency, transcript, language } = req.body;

      if (!category || !REQUEST_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Please select a valid assistance category" });
      }
      const amount = Number(amountRequested);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Please specify a valid requested amount greater than 0" });
      }
      if (!purpose || String(purpose).trim().length < 5) {
        return res.status(400).json({ message: "Please provide a clear description of your need" });
      }

      let request;
      if (requestId) {
        request = await AssistanceRequestModel.findOne({ _id: requestId, farmerId, status: REQUEST_STATUS.DRAFT });
      }

      const requestPayload = {
        category,
        amountRequested: amount,
        purpose: String(purpose).trim(),
        language: LANGUAGES.includes(language) ? language : user.preferredLanguage || "en",
        transcript: transcript ? String(transcript).trim() : undefined,
        extractedFields: {
          urgency: urgency || "standard",
        },
        status: REQUEST_STATUS.SUBMITTED,
      };

      if (request) {
        Object.assign(request, requestPayload);
        await request.save();
      } else {
        request = await AssistanceRequestModel.create({
          farmerId,
          ...requestPayload,
        });
      }

      return res.status(201).json({
        request: {
          id: String(request._id),
          category: request.category,
          amountRequested: request.amountRequested,
          purpose: request.purpose,
          status: request.status,
          createdAt: request.createdAt,
        },
        message: "Your assistance request has been submitted for verification.",
      });
    } catch (error) {
      console.error("Submit request error:", error);
      return res.status(500).json({ message: "Unable to submit assistance request" });
    }
  });

  /**
   * PUT /requests/:id/resubmit
   * Resubmits a previously rejected request after editing.
   */
  router.put("/requests/:id/resubmit", async (req, res) => {
    try {
      const farmerId = req.auth.userId;
      const request = await AssistanceRequestModel.findOne({ _id: req.params.id, farmerId });

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (request.status !== REQUEST_STATUS.REJECTED) {
        return res.status(400).json({ message: "Only rejected requests can be resubmitted" });
      }

      const { category, amountRequested, purpose } = req.body;
      if (category && !REQUEST_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      if (amountRequested !== undefined) {
        const amt = Number(amountRequested);
        if (isNaN(amt) || amt <= 0) {
          return res.status(400).json({ message: "Invalid requested amount" });
        }
        request.amountRequested = amt;
      }
      if (purpose) {
        request.purpose = String(purpose).trim();
      }
      if (category) {
        request.category = category;
      }

      request.status = REQUEST_STATUS.SUBMITTED;
      request.reviewNotes = null;
      request.reviewedAt = null;
      request.reviewedBy = null;
      await request.save();

      return res.json({
        request: {
          id: String(request._id),
          category: request.category,
          amountRequested: request.amountRequested,
          purpose: request.purpose,
          status: request.status,
          updatedAt: request.updatedAt,
        },
        message: "Your request has been resubmitted for verification.",
      });
    } catch (error) {
      console.error("Resubmit request error:", error);
      return res.status(500).json({ message: "Unable to resubmit request" });
    }
  });

  /**
   * GET /documents
   * Lists farmer's documents with own verification status and rejection reasons.
   * NEVER exposes file URLs or storage keys to the farmer.
   */
  router.get("/documents", async (req, res) => {
    try {
      const farmerId = req.auth.userId;
      const docs = await DocumentModel.find({ ownerId: farmerId, replacedBy: null }).sort({ createdAt: -1 });
      return res.json({ documents: docs.map(sanitizeDocument) });
    } catch (error) {
      console.error("Get farmer documents error:", error);
      return res.status(500).json({ message: "Unable to load documents" });
    }
  });

  /**
   * POST /documents/:id/reupload
   * Re-uploads a rejected document without redoing full registration.
   */
  router.post("/documents/:id/reupload", (req, res) => {
    uploadSingle(req, res, async (uploadError) => {
      if (uploadError) {
        if (uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Document must be 8 MB or smaller" });
        }
        return res.status(400).json({ message: uploadError.message || "Invalid file upload" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "A document file is required" });
      }

      try {
        const farmerId = req.auth.userId;
        const document = await DocumentModel.findOne({ _id: req.params.id, ownerId: farmerId });

        if (!document) {
          await unlink(file.path).catch(() => {});
          return res.status(404).json({ message: "Document not found" });
        }

        if (document.verificationStatus !== DOCUMENT_STATUS.REJECTED) {
          await unlink(file.path).catch(() => {});
          return res.status(400).json({ message: "Only rejected documents can be re-uploaded" });
        }

        const validSignature = await matchesFileSignature(file);
        if (!validSignature) {
          await unlink(file.path).catch(() => {});
          return res.status(400).json({ message: "Document file does not match its expected format" });
        }

        await chmod(file.path, 0o600);

        // Update the document record to pending
        document.storageKey = path.basename(file.filename);
        document.mimeType = file.mimetype;
        document.size = file.size;
        document.verificationStatus = DOCUMENT_STATUS.PENDING;
        document.rejectionReason = null;
        document.verifiedBy = null;
        document.verifiedAt = null;
        await document.save();

        // If the user's status was rejected or additional_information_required, transition back to under_review
        await UserModel.updateOne(
          { _id: farmerId, farmerVerificationStatus: { $in: ["rejected", "additional_information_required"] } },
          { $set: { farmerVerificationStatus: "under_review", verificationStatus: "pending" } },
        );

        return res.json({
          document: sanitizeDocument(document),
          message: "Document re-uploaded successfully and is now pending verification.",
        });
      } catch (error) {
        if (file) {
          await unlink(file.path).catch(() => {});
        }
        console.error("Reupload document error:", error);
        return res.status(500).json({ message: "Unable to process document re-upload" });
      }
    });
  });

  /**
   * GET /profile
   * Returns profile data for settings.
   */
  router.get("/profile", async (req, res) => {
    try {
      const user = await UserModel.findById(req.auth.userId);
      if (!user) {
        return res.status(404).json({ message: "Farmer not found" });
      }

      return res.json({
        profile: {
          id: String(user._id),
          name: user.name,
          phone: user.phone,
          email: user.email,
          village: user.village,
          district: user.district,
          state: user.state,
          landSizeAcres: user.landSizeAcres,
          cropType: user.cropType,
          preferredLanguage: user.preferredLanguage,
          farmerVerificationStatus: user.farmerVerificationStatus,
          verificationStatus: user.verificationStatus,
        },
      });
    } catch (error) {
      console.error("Get farmer profile error:", error);
      return res.status(500).json({ message: "Unable to load profile" });
    }
  });

  /**
   * PUT /profile
   * Updates profile fields.
   * If identity or land fields are changed on a verified account, resets verification to under_review.
   */
  router.put("/profile", async (req, res) => {
    try {
      const user = await UserModel.findById(req.auth.userId);
      if (!user) {
        return res.status(404).json({ message: "Farmer not found" });
      }

      const { preferredLanguage, cropType, village, district, state, landSizeAcres, name } = req.body;

      if (preferredLanguage && LANGUAGES.includes(preferredLanguage)) {
        user.preferredLanguage = preferredLanguage;
      }
      if (cropType !== undefined) {
        user.cropType = String(cropType).trim();
      }

      // Check if identity/land fields changed
      let triggeredReverification = false;
      const isLandOrIdentityChanged =
        (name !== undefined && name.trim() !== user.name) ||
        (village !== undefined && village.trim() !== user.village) ||
        (district !== undefined && district.trim() !== user.district) ||
        (state !== undefined && state.trim() !== user.state) ||
        (landSizeAcres !== undefined && Number(landSizeAcres) !== user.landSizeAcres);

      if (isLandOrIdentityChanged) {
        if (name) user.name = String(name).trim();
        if (village) user.village = String(village).trim();
        if (district) user.district = String(district).trim();
        if (state) user.state = String(state).trim();
        if (landSizeAcres !== undefined) {
          const acres = Number(landSizeAcres);
          if (!isNaN(acres) && acres > 0) user.landSizeAcres = acres;
        }

        // If previously verified, reset to under_review because official records must be re-checked
        if (user.farmerVerificationStatus === "verified") {
          user.farmerVerificationStatus = "under_review";
          user.verificationStatus = "pending";
          triggeredReverification = true;
        }
      }

      await user.save();

      return res.json({
        profile: {
          id: String(user._id),
          name: user.name,
          phone: user.phone,
          email: user.email,
          village: user.village,
          district: user.district,
          state: user.state,
          landSizeAcres: user.landSizeAcres,
          cropType: user.cropType,
          preferredLanguage: user.preferredLanguage,
          farmerVerificationStatus: user.farmerVerificationStatus,
          verificationStatus: user.verificationStatus,
        },
        triggeredReverification,
        message: triggeredReverification
          ? "Profile updated. Because your official details changed, your account is queued for re-verification."
          : "Profile updated successfully.",
      });
    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Unable to update profile" });
    }
  });

  /**
   * POST /extract
   * LLM extraction proxy (calls requestExtractor service in mock or real mode).
   */
  router.post("/extract", async (req, res) => {
    try {
      const { transcript, language, currentFields } = req.body;
      const result = await extractAssistanceRequest({
        transcript,
        language: language || req.auth.preferredLanguage || "en",
        currentFields: currentFields || {},
      });
      return res.json(result);
    } catch (error) {
      console.error("Request extraction endpoint error:", error);
      return res.status(500).json({ message: "Unable to extract request details" });
    }
  });

  return router;
}

export default createFarmerWorkspaceRouter();
