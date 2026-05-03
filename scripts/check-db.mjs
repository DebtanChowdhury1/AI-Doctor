import { promises as dns } from "node:dns";
import dnsResolver from "node:dns";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";

function loadEnvFile(path) {
  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function maskMongoUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}

function getSrvHostname(uri) {
  const parsed = new URL(uri);
  return `_mongodb._tcp.${parsed.hostname}`;
}

loadEnvFile(".env.local");

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is missing in .env.local");
  process.exit(1);
}

console.log(`Using ${maskMongoUri(uri)}`);

if (uri.startsWith("mongodb+srv://")) {
  dnsResolver.setServers(["8.8.8.8", "1.1.1.1"]);

  const srvHostname = getSrvHostname(uri);
  console.log(`Checking DNS SRV ${srvHostname}`);

  try {
    const records = await dns.resolveSrv(srvHostname);
    console.log(`DNS OK: found ${records.length} MongoDB SRV record(s).`);
  } catch (error) {
    console.error(`DNS failed for ${srvHostname}`);
    console.error(`${error.code ?? "ERROR"}: ${error.message}`);
    console.error("Copy a fresh connection string from MongoDB Atlas and update MONGODB_URI.");
    process.exit(1);
  }
}

try {
  await mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 8000,
  });

  console.log("MongoDB connection OK.");
} catch (error) {
  console.error("MongoDB connection failed.");
  console.error(`${error.name}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
