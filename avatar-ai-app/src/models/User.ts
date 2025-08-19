import { Schema, model, models, type Model } from "mongoose";

export interface IUser {
  name?: string;
  email: string;
  passwordHash?: string;
  stripeCustomerId?: string;
  credits: number;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String },
  stripeCustomerId: { type: String },
  credits: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
});

export const User: Model<IUser> =
  models.User || model<IUser>("User", userSchema);
