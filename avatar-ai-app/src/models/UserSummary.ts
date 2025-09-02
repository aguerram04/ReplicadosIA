import { Schema, model, models, type Model, Types } from "mongoose";

export interface IUserSummary {
  userId: Types.ObjectId;
  email?: string;
  name?: string | null;
  totalCredits?: number;
  dollarToCreditPct?: number; // 0..100
  updatedAt: Date;
}

const userSummarySchema = new Schema<IUserSummary>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
    unique: true,
  },
  email: { type: String, index: true },
  name: { type: String },
  totalCredits: { type: Number, default: 0 },
  dollarToCreditPct: { type: Number, min: 0, max: 100, default: 50 },
  updatedAt: { type: Date, default: () => new Date() },
});

export const UserSummary: Model<IUserSummary> =
  models.UserSummary || model<IUserSummary>("UserSummary", userSummarySchema);
