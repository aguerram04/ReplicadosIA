import { Schema, model, models, type Model } from "mongoose";

export interface IWebhookEvent {
  provider: "stripe" | "heygen";
  eventType: string;
  payload: unknown;
  handledAt?: Date;
  createdAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>({
  provider: { type: String, enum: ["stripe", "heygen"], required: true },
  eventType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  handledAt: { type: Date },
  createdAt: { type: Date, default: () => new Date() },
});

export const WebhookEvent: Model<IWebhookEvent> =
  models.WebhookEvent ||
  model<IWebhookEvent>("WebhookEvent", webhookEventSchema);
