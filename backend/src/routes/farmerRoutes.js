import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { chmod, mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Document, User } from '../models/index.js';
import { DOCUMENT_STATUS, ROLES } from '../utils/constants.js';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_SUPPORTING_DOCUMENTS = 5;
const PRIVATE_UPLOAD_DIRECTORY = path.resolve(
  process.env.PRIVATE_UPLOAD_DIR ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../private-uploads'),
);
const ALLOWED_FILES = new Map([
  ['.pdf', 'application/pdf'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
]);

const acresSchema = z
  .union([
    z.number().finite(),
    z.string().trim().regex(/^(?:\d+\.?\d*|\.\d+)$/),
  ])
  .transform(Number)
  .refine((value) => value > 0 && value <= 10000);

const farmerRegistrationSchema = z.strictObject({
  fullName: z.string().trim().min(2).max(100),
  mobileNumber: z.string().trim().regex(/^[6-9]\d{9}$/),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  village: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  landSizeAcres: acresSchema,
  cropType: z.string().trim().min(1).max(100),
  preferredLanguage: z.enum(['mr-IN', 'hi-IN', 'en-IN', 'en', 'hi', 'mr']),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72),
  farmerRegistrationKey: z.string().uuid(),
});

function isSupportedFile(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return ALLOWED_FILES.get(extension) === file.mimetype;
}

function createUploadMiddleware(storageDirectory) {
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
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: MAX_SUPPORTING_DOCUMENTS + 2,
      fields: 12,
      parts: MAX_SUPPORTING_DOCUMENTS + 14,
    },
    fileFilter(_req, file, callback) {
      if (!isSupportedFile(file)) {
        const error = new Error('Use a PDF, JPG, JPEG, or PNG file');
        error.status = 400;
        callback(error);
        return;
      }
      callback(null, true);
    },
  }).fields([
    { name: 'aadhaarDocument', maxCount: 1 },
    { name: 'landDocument', maxCount: 1 },
    { name: 'supportingDocuments', maxCount: MAX_SUPPORTING_DOCUMENTS },
  ]);
}

function parseUploads(upload) {
  return (req, res, next) => {
    upload(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        const message =
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Each document must be 8 MB or smaller'
            : 'Check the uploaded documents and try again';
        res.status(400).json({ message });
        return;
      }

      res.status(error.status ?? 500).json({
        message:
          error.status === 400
            ? error.message
            : 'Unable to receive uploaded documents',
      });
    });
  };
}

async function removeFiles(files) {
  await Promise.all(
    files.map(async (file) => {
      try {
        await unlink(file.path);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }),
  );
}

async function matchesFileSignature(file) {
  const handle = await open(file.path, 'r');
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    switch (file.mimetype) {
      case 'application/pdf':
        return signature.subarray(0, 5).toString() === '%PDF-';
      case 'image/jpeg':
        return signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
      case 'image/png':
        return signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      default:
        return false;
    }
  } finally {
    await handle.close();
  }
}

function getUploadedFiles(files = {}) {
  return [
    ...(files.aadhaarDocument ?? []),
    ...(files.landDocument ?? []),
    ...(files.supportingDocuments ?? []),
  ];
}

function buildFarmerResponse(user) {
  return {
    id: String(user.id ?? user._id),
    fullName: user.name,
    mobileNumber: user.phone,
    email: user.email,
    village: user.village,
    district: user.district,
    state: user.state,
    landSizeAcres: user.landSizeAcres,
    cropType: user.cropType,
    preferredLanguage: user.preferredLanguage,
    verificationStatus: user.farmerVerificationStatus ?? 'pending',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeLanguage(language) {
  return language.replace(/-IN$/, '');
}

export function createFarmerRouter({
  UserModel = User,
  DocumentModel = Document,
  registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ message: 'Too many registration attempts' }),
  }),
  storageDirectory = PRIVATE_UPLOAD_DIRECTORY,
} = {}) {
  const router = Router();
  const upload = parseUploads(createUploadMiddleware(storageDirectory));

  router.post('/register', registrationLimiter, upload, async (req, res) => {
    const files = getUploadedFiles(req.files);
    let farmer;
    const createdDocuments = [];

    try {
      if (!req.files?.aadhaarDocument?.length || !req.files?.landDocument?.length) {
        await removeFiles(files);
        return res.status(400).json({
          message: 'Upload both the Aadhaar card and land ownership certificate',
        });
      }

      await Promise.all(files.map((file) => chmod(file.path, 0o600)));

      const result = farmerRegistrationSchema.safeParse(req.body);
      if (!result.success) {
        await removeFiles(files);
        return res.status(400).json({
          message: 'Check the farmer registration details',
        });
      }

      for (const file of files) {
        if (!(await matchesFileSignature(file))) {
          await removeFiles(files);
          return res.status(400).json({
            message: 'A document does not match its file type',
          });
        }
      }

      const { password, farmerRegistrationKey, email, ...userData } = result.data;
      const existingRegistration = await UserModel.findOne({
        farmerRegistrationKey,
        role: ROLES.FARMER,
      });
      if (existingRegistration) {
        await removeFiles(files);
        return res.status(200).json({
          farmer: buildFarmerResponse(existingRegistration),
        });
      }

      farmer = await UserModel.create({
        name: userData.fullName,
        phone: userData.mobileNumber,
        ...(email ? { email } : {}),
        passwordHash: await bcrypt.hash(password, 10),
        farmerRegistrationKey,
        role: ROLES.FARMER,
        preferredLanguage: normalizeLanguage(userData.preferredLanguage),
        village: userData.village,
        district: userData.district,
        state: userData.state,
        landSizeAcres: userData.landSizeAcres,
        cropType: userData.cropType,
        verificationStatus: 'pending',
        farmerVerificationStatus: 'pending',
        verificationSubmittedAt: new Date(),
        isActive: true,
      });

      const documentFiles = [
        ...(req.files.aadhaarDocument ?? []).map((file) => ({
          file,
          type: 'aadhaar',
        })),
        ...(req.files.landDocument ?? []).map((file) => ({
          file,
          type: 'land_certificate',
        })),
        ...(req.files.supportingDocuments ?? []).map((file) => ({
          file,
          type: 'supporting',
        })),
      ];

      for (const { file, type } of documentFiles) {
        const document = await DocumentModel.create({
          ownerId: farmer._id ?? farmer.id,
          type,
          storageKey: path.basename(file.filename),
          mimeType: file.mimetype,
          size: file.size,
          verificationStatus: DOCUMENT_STATUS.PENDING,
        });
        createdDocuments.push(document);
      }

      await UserModel.updateOne(
        { _id: farmer._id ?? farmer.id },
        { $set: { documents: createdDocuments.map((document) => document._id ?? document.id) } },
      );

      return res.status(201).json({
        farmer: buildFarmerResponse(farmer),
        message: 'Registration and documents submitted. Your account is awaiting verification.',
      });
    } catch (error) {
      if (farmer) {
        if (createdDocuments.length) {
          await DocumentModel.deleteMany({
            _id: { $in: createdDocuments.map((document) => document._id ?? document.id) },
          });
        }
        await UserModel.deleteOne({ _id: farmer._id ?? farmer.id });
      }

      await removeFiles(files);

      if (error.code === 11000) {
        return res.status(409).json({
          message: 'This number or email is already registered',
        });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Check the farmer registration details',
        });
      }

      return res.status(500).json({
        message: 'Unable to save farmer registration and documents',
      });
    }
  });

  return router;
}

export default createFarmerRouter();
