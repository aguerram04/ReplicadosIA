import { Schema, model, models, Types } from "mongoose";

export interface IVendorLedger {
  userId?: Types.ObjectId | null;
  userEmail?: string | null;
  userName?: string | null;
  type: "purchase" | "consumption";
  vendor: "heygen" | "stripe" | string;
  credits: number; // créditos de usuario impactados (positivos en compra, negativos en consumo)
  vendorCostUsd: number; // costo real en USD con el proveedor
  revenueUsd?: number; // ingreso en USD (cliente)
  marginUsd?: number; // revenue - vendorCost
  meta?: Record<string, any>;
  createdAt: Date;
}

const VendorLedgerSchema = new Schema<IVendorLedger>({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  userEmail: { type: String, index: true },
  userName: { type: String },
  type: {
    type: String,
    enum: ["purchase", "consumption"],
    required: true,
    index: true,
  },
  vendor: { type: String, required: true, index: true },
  credits: { type: Number, required: true },
  vendorCostUsd: { type: Number, required: true },
  revenueUsd: { type: Number },
  marginUsd: { type: Number },
  meta: { type: Object },
  createdAt: { type: Date, default: () => new Date(), index: true },
});

export default models.VendorLedger || model("VendorLedger", VendorLedgerSchema);
