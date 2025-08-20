import { Schema, model, models, type Model, Types } from "mongoose";

export interface IUserSession {
  userId: Types.ObjectId;
  email: string;
  name?: string | null;
  provider?: string;
  loginAt: Date;
  logoutAt?: Date;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSessionSchema = new Schema<IUserSession>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    email: { type: String, required: true, index: true },
    name: { type: String },
    provider: { type: String },
    loginAt: { type: Date, required: true, default: () => new Date() },
    logoutAt: { type: Date },
    ip: { type: String },
    userAgent: { type: String },
    success: { type: Boolean, default: true },
    error: { type: String },
  },
  { timestamps: true }
);

userSessionSchema.index({ userId: 1, loginAt: -1 });

export const UserSession: Model<IUserSession> =
  models.UserSession || model<IUserSession>("UserSession", userSessionSchema);
