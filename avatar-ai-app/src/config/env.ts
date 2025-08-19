import { z } from "zod";

const envSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  MONGODB_URI: z.string().min(1),
  HEYGEN_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  UPLOADTHING_TOKEN: z.string().optional().default(""),
});

export const env = envSchema.parse({
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  HEYGEN_API_KEY: process.env.HEYGEN_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
});
