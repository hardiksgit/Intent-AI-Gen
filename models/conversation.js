import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    sender_username: { type: String, required: true },
    receiver_username: { type: String, required: true },
    message: { type: String, required: true },
    channel: {
      type: String,
      enum: ["instagram", "facebook", "whatsapp", "email"],
      required: true,
    },
    intents: { type: [String], required: true },
    response: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);
