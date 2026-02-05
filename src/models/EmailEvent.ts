import { model, models, Schema } from "mongoose";

const EmailEventSchema = new Schema(
  {
    type: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },

    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },

    resendId: String,
    error: String,

    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

export const EmailEvent = models.EmailEvent || model('EmailEvent', EmailEventSchema);
