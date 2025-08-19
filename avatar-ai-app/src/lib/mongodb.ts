import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  console.warn(
    "[mongodb] MONGODB_URI is not set. Database connection will fail when used."
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const globalCache = global.__mongooseCache || { conn: null, promise: null };
if (!global.__mongooseCache) global.__mongooseCache = globalCache;

export async function connectToDatabase() {
  if (globalCache.conn) return globalCache.conn;
  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }) as unknown as Promise<typeof mongoose>;
  }
  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
