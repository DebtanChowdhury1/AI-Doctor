import mongoose from "mongoose";

mongoose.set("strictQuery", true);

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { connection: null, promise: null };
}

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing");
  }

  if (cached?.connection) {
    return cached.connection;
  }

  if (!cached?.promise) {
    cached!.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  cached!.connection = await cached!.promise;
  return cached!.connection;
}
