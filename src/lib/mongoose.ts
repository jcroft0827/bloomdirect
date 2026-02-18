import mongoose from "mongoose";

let isConnected = false;

export const connectToDB = async () => {
  if (isConnected) return;
  // await mongoose.connect(process.env.MONGODB_URI!);
  const MONGODB_URI = 
    process.env.NODE_ENV === "production"
      ? process.env.MONGODB_URI
      : process.env.MONGODB_URI_DEV;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }
  await mongoose.connect(MONGODB_URI!);
  isConnected = true;
};