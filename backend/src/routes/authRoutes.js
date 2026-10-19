import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { User } from "../models/index.js";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { LANGUAGES, ROLES } from "../utils/constants.js";

const donorRegistrationSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/),
  email: z.string().trim().email().max(254).optional(),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
  preferredLanguage: z.enum(LANGUAGES).optional(),
});

const loginSchema = z.object({
  phone: z.string().trim().min(1),
  password: z.string().min(1),
});

function createAuthResponse(user) {
  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
    },
  };
}

export function createAuthRouter({
  UserModel = User,
  registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ message: "Too many registration attempts" }),
  }),
} = {}) {
  const router = Router();

  router.post("/register/donor", registrationLimiter, async (req, res) => {
    const result = donorRegistrationSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ message: "Check the donor registration details" });
    }

    const { password, ...userData } = result.data;

    try {
      const user = await UserModel.create({
        ...userData,
        passwordHash: await bcrypt.hash(password, 10),
        role: ROLES.DONOR,
      });

      return res.status(201).json(createAuthResponse(user));
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "This phone number or email is already registered",
        });
      }

      return res
        .status(500)
        .json({ message: "Unable to create donor account" });
    }
  });

  router.post("/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ message: "Phone and password are required" });
    }

    const user = await UserModel.findOne({ phone: result.data.phone }).select(
      "+passwordHash",
    );
    const passwordMatches =
      user && (await bcrypt.compare(result.data.password, user.passwordHash));

    if (!passwordMatches || !user.isActive) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    return res.json(createAuthResponse(user));
  });

  router.get("/me", authenticateToken, async (req, res) => {
    const user = await UserModel.findById(req.auth.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User is no longer active" });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  });

  return router;
}

export default createAuthRouter();
