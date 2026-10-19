import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { FarmerRegistration } from '../models/index.js';

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
  village: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  landSizeAcres: acresSchema,
  cropType: z.string().trim().min(1).max(100),
  preferredLanguage: z.enum(['mr-IN', 'hi-IN', 'en-IN']),
});

export function createFarmerRouter({
  FarmerRegistrationModel = FarmerRegistration,
  registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ message: 'Too many registration attempts' }),
  }),
} = {}) {
  const router = Router();

  router.post('/register', registrationLimiter, async (req, res) => {
    const result = farmerRegistrationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Check the farmer registration details',
      });
    }

    try {
      const farmer = await FarmerRegistrationModel.create({
        ...result.data,
        verificationStatus: 'pending',
      });
      return res.status(201).json({
        farmer: {
          id: farmer.id,
          fullName: farmer.fullName,
          mobileNumber: farmer.mobileNumber,
          village: farmer.village,
          district: farmer.district,
          state: farmer.state,
          landSizeAcres: farmer.landSizeAcres,
          cropType: farmer.cropType,
          preferredLanguage: farmer.preferredLanguage,
          verificationStatus: farmer.verificationStatus,
          createdAt: farmer.createdAt,
          updatedAt: farmer.updatedAt,
        },
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: 'This number is already registered',
        });
      }

      return res
        .status(500)
        .json({ message: 'Unable to save farmer registration' });
    }
  });

  return router;
}

export default createFarmerRouter();
