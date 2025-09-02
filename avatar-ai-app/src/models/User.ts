import { Schema, model, models, type Model } from "mongoose";

export interface IUser {
  name?: string;
  email: string;
  passwordHash?: string;
  stripeCustomerId?: string;
  credits: number;
  role?: "user" | "admin";
  isAdmin?: boolean;
  dollarToCreditPct?: number; // 0..100, 100 => $1 = 1 crédito
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String },
  stripeCustomerId: { type: String },
  credits: { type: Number, default: 0 },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    index: true,
  },
  isAdmin: { type: Boolean, default: false, index: true },
  dollarToCreditPct: { type: Number, min: 0, max: 100, default: 50 },
  createdAt: { type: Date, default: () => new Date() },
});

export const User: Model<IUser> =
  models.User || model<IUser>("User", userSchema);
