import mongoose from "mongoose";

// Prefer explicit MONGODB_URI; otherwise choose by environment
const STAGE = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  (STAGE === "production"
    ? process.env.MONGODB_URI_PROD
    : process.env.MONGODB_URI_DEV) ||
  "";

// Optional explicit db name override to split dev/prod databases on same cluster
const DB_NAME =
  process.env.MONGODB_DB_NAME ||
  (STAGE === "production"
    ? process.env.MONGODB_DB_NAME_PROD
    : process.env.MONGODB_DB_NAME_DEV);

if (!MONGODB_URI) {
  console.warn(
    "[mongodb] No MongoDB URI found. Set MONGODB_URI or MONGODB_URI_DEV/MONGODB_URI_PROD."
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
      ...(DB_NAME ? { dbName: DB_NAME } : {}),
    }) as unknown as Promise<typeof mongoose>;
  }
  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
