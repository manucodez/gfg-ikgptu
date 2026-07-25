import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

// Image storage backend for member avatars and gallery photos.
// Local disk (the original /public/images approach) doesn't survive
// on serverless hosts like Vercel/Netlify, where the filesystem is
// read-only at runtime and wiped between deploys — so uploads go to
// Cloudinary instead, and only the resulting URL is stored in the
// database (see lib/content-store.ts).

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Uploads a File to Cloudinary under gfg-ikgptu/<folder>/ and returns
 *  its public HTTPS URL — the same kind of string the old local-disk
 *  version returned (e.g. "/images/members/xyz.jpg"), just pointing
 *  at Cloudinary instead of /public. */
export async function uploadImage(
  file: File,
  folder: "members" | "gallery"
): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `gfg-ikgptu/${folder}` },
      (error, uploaded) => {
        if (error || !uploaded) reject(error ?? new Error("Cloudinary upload returned no result."));
        else resolve(uploaded);
      }
    );
    stream.end(bytes);
  });
  return result.secure_url;
}

/** Removes a previously-uploaded image given its Cloudinary URL.
 *  Silently does nothing for URLs that aren't ours (e.g. a leftover
 *  "/images/..." path from before this migration) — same fallback
 *  behavior as the original local-disk version. */
export async function deleteImage(url: string): Promise<void> {
  if (!url.includes("res.cloudinary.com")) return;
  // Cloudinary URLs look like:
  //   https://res.cloudinary.com/<cloud>/image/upload/v169.../gfg-ikgptu/members/abc123.jpg
  // The public_id is everything after "/upload/v<version>/" with the
  // file extension stripped off.
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  if (!match) return;
  try {
    await cloudinary.uploader.destroy(match[1]);
  } catch {
    // Already gone, or never existed — nothing to do.
  }
}
