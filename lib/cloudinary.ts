import "server-only";

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({ secure: true });

function ensureConfigured() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is not configured");
  }
}

export async function uploadPdf(buffer: Buffer, filename: string) {
  ensureConfigured();

  return new Promise<string>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "ai-mentor/pdfs",
        resource_type: "raw",
        public_id: filename.replace(/\s+/g, "-").toLowerCase(),
        format: "pdf",
        overwrite: true,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Failed to upload PDF"));
          return;
        }

        resolve(result.secure_url);
      },
    );

    upload.end(buffer);
  });
}

export async function uploadAvatar(base64: string, filename: string) {
  ensureConfigured();

  const data = base64.includes(",") ? base64.split(",")[1] ?? "" : base64;
  const buffer = Buffer.from(data, "base64");

  return new Promise<string>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "ai-mentor/avatars",
        public_id: filename.replace(/\s+/g, "-").toLowerCase(),
        overwrite: true,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Failed to upload avatar"));
          return;
        }

        resolve(result.secure_url);
      },
    );

    upload.end(buffer);
  });
}
