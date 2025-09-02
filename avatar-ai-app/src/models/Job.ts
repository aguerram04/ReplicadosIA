import { Schema, model, models, type Model } from "mongoose";

export type JobInputType = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";
export type JobStatus = "draft" | "queued" | "processing" | "done" | "error";

export interface IJob {
  userId: string;
  title: string;
  script?: string;
  inputType: JobInputType;
  avatarId?: string;
  voiceId?: string;
  voiceSpeed?: number;
  consent: boolean;
  assets?: string[];
  mediaUrls?: string[];
  providerJobId?: string;
  resultUrl?: string;
  error?: string;
  heygenTaskId?: string;
  outputUrl?: string;
  errorMessage?: string;
  width?: number;
  height?: number;
  // Background customization
  backgroundType?: "none" | "color" | "image" | "video";
  backgroundColor?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundPlayStyle?: "fit_to_scene" | "freeze" | "loop" | "once";
  // Translate fields
  sourceLang?: string;
  targetLang?: string;
  translateTaskId?: string;
  translateUrl?: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  // Credits accounting
  estimatedCredits?: number;
  actualCredits?: number;
  vendorCostUsd?: number;
}

const JobSchema = new Schema<IJob>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    script: { type: String, required: false, default: "" },
    inputType: {
      type: String,
      enum: ["TEXT", "IMAGE", "AUDIO", "VIDEO"],
      default: "TEXT",
    },
    avatarId: { type: String },
    voiceId: { type: String },
    voiceSpeed: { type: Number },
    consent: { type: Boolean, default: false },
    assets: { type: [String], default: [] },
    mediaUrls: { type: [String], default: [] },
    providerJobId: { type: String },
    resultUrl: { type: String },
    error: { type: String },
    heygenTaskId: { type: String },
    outputUrl: { type: String },
    errorMessage: { type: String },
    width: { type: Number },
    height: { type: Number },
    backgroundType: { type: String },
    backgroundColor: { type: String },
    backgroundImageUrl: { type: String },
    backgroundVideoUrl: { type: String },
    backgroundPlayStyle: { type: String },
    sourceLang: { type: String },
    targetLang: { type: String },
    translateTaskId: { type: String },
    translateUrl: { type: String },
    status: {
      type: String,
      enum: ["draft", "queued", "processing", "done", "error"],
      default: "draft",
    },
  },
  { timestamps: true }
);

export const Job: Model<IJob> = models.Job || model<IJob>("Job", JobSchema);
