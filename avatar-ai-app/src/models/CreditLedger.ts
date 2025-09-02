import { Schema, model, models, type Model, Types } from "mongoose";

export type CreditReason = "purchase" | "spend" | "adjust";

export interface ICreditLedger {
  userId: Types.ObjectId;
  userEmail?: string;
  userName?: string | null;
  dollarToCreditPct?: number;
  amount: number; // positive or negative
  reason: CreditReason;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const creditLedgerSchema = new Schema<ICreditLedger>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  amount: { type: Number, required: true },
  reason: {
    type: String,
    enum: ["purchase", "spend", "adjust"],
    required: true,
  },
  dollarToCreditPct: { type: Number, min: 0, max: 100 },
  userEmail: { type: String, index: true },
  userName: { type: String },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date() },
});

export const CreditLedger: Model<ICreditLedger> =
  models.CreditLedger ||
  model<ICreditLedger>("CreditLedger", creditLedgerSchema);
