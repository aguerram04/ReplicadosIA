import { connectToDatabase } from "./mongodb";
import {
  User,
  CreditLedger,
  VideoJob,
  WebhookEvent,
  type IUser,
  type ICreditLedger,
  type IVideoJob,
} from "@/models";
import { Types } from "mongoose";

export async function findOrCreateUserByEmail(
  email: string,
  data?: Partial<IUser>
) {
  await connectToDatabase();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, credits: 0, ...data });
  }
  return user;
}

export async function recordUserLoginEvent(params: {
  userId: string;
  email: string;
  name?: string | null;
  provider?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}) {
  await connectToDatabase();
  const { UserSession } = await import("@/models");
  return UserSession.create({
    userId: new Types.ObjectId(params.userId),
    email: params.email,
    name: params.name ?? undefined,
    provider: params.provider,
    ip: params.ip,
    userAgent: params.userAgent,
    success: params.success,
    error: params.error,
    loginAt: new Date(),
  });
}

export async function recordUserLogoutByUser(params: { userId: string }) {
  await connectToDatabase();
  const { UserSession } = await import("@/models");
  await UserSession.findOneAndUpdate(
    { userId: new Types.ObjectId(params.userId), logoutAt: { $exists: false } },
    { $set: { logoutAt: new Date() } },
    { sort: { loginAt: -1 } }
  );
}

export async function addCredits(
  userId: string,
  amount: number,
  reason: ICreditLedger["reason"],
  meta?: Record<string, unknown>
) {
  await connectToDatabase();
  const uid = new Types.ObjectId(userId);
  await CreditLedger.create({ userId: uid, amount, reason, meta });
  await User.updateOne({ _id: uid }, { $inc: { credits: amount } });
}

export async function spendCredits(
  userId: string,
  amount: number,
  reason: ICreditLedger["reason"],
  meta?: Record<string, unknown>
) {
  return addCredits(userId, -Math.abs(amount), reason, meta);
}

export async function createVideoJob(userId: string, job: Partial<IVideoJob>) {
  await connectToDatabase();
  return VideoJob.create({
    userId,
    status: "queued",
    uploadedAssets: [],
    ...job,
  });
}

export async function updateVideoJobByCallback(
  callbackId: string,
  update: Partial<IVideoJob>
) {
  await connectToDatabase();
  return VideoJob.findOneAndUpdate({ callbackId }, update, { new: true });
}

export async function saveWebhookEvent(
  provider: "stripe" | "heygen",
  eventType: string,
  payload: unknown,
  handledAt?: Date
) {
  await connectToDatabase();
  return WebhookEvent.create({ provider, eventType, payload, handledAt });
}
