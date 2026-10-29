import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  GNANI_API_KEY: z.string().default(""),
  RAZORPAY_KEY_ID: z.string().default("rzp_test_sevavoice_placeholder"),
  RAZORPAY_KEY_SECRET: z.string().default("rzp_test_secret_placeholder"),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = result.data;
