import { Schema, model, models, type Model, Types } from "mongoose";

export type CreditReason = "purchase" | "spend" | "adjust";

export interface ICreditLedger {
  userId: Types.ObjectId;
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
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date() },
});

export const CreditLedger: Model<ICreditLedger> =
  models.CreditLedger ||
  model<ICreditLedger>("CreditLedger", creditLedgerSchema);
