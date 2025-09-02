import { Schema, model, models, type Model } from "mongoose";

export interface ISystemSetting {
  key: string;
  value?: any;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
});

SystemSettingSchema.pre("save", function (next) {
  (this as any).updatedAt = new Date();
  next();
});

const SystemSetting: Model<ISystemSetting> =
  models.SystemSetting ||
  model<ISystemSetting>("SystemSetting", SystemSettingSchema);

export default SystemSetting;
