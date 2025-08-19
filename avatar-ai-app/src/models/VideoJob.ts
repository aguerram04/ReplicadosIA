import { Schema, model, models, type Model, Types } from "mongoose";

export type VideoJobStatus = "queued" | "processing" | "completed" | "failed";

export interface IVideoJob {
  userId: Types.ObjectId;
  status: VideoJobStatus;
  prompt?: string;
  avatarId?: string;
  voiceId?: string;
  uploadedAssets?: string[]; // URLs
  heygenJobId?: string;
  callbackId: string;
  resultUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const videoJobSchema = new Schema<IVideoJob>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["queued", "processing", "completed", "failed"],
    default: "queued",
  },
  prompt: { type: String },
  avatarId: { type: String },
  voiceId: { type: String },
  uploadedAssets: { type: [String], default: [] },
  heygenJobId: { type: String },
  callbackId: { type: String, required: true, unique: true, index: true },
  resultUrl: { type: String },
  error: { type: String },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
});

videoJobSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const VideoJob: Model<IVideoJob> =
  models.VideoJob || model<IVideoJob>("VideoJob", videoJobSchema);
