import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/lib/session";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 20;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Login required." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided." }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json({
        success: false,
        message: "Only JPEG, PNG, WebP images and MP4/MOV/WebM videos (max 15s) are allowed.",
      }, { status: 400 });
    }

    const maxMb = isImage ? MAX_IMAGE_MB : MAX_VIDEO_MB;
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        message: `File must be smaller than ${maxMb}MB.`,
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadOptions: Record<string, unknown> = {
      folder: "shopka/reviews",
      resource_type: isVideo ? "video" : "image",
    };

    if (isImage) {
      uploadOptions.transformation = [
        { width: 1080, crop: "limit", quality: "auto:good", fetch_format: "auto" },
      ];
    }

    if (isVideo) {
      // Limit video to 15 seconds
      uploadOptions.transformation = [{ duration: "15" }];
    }

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(uploadOptions, (error, res) => {
            if (error || !res) reject(error ?? new Error("Upload failed"));
            else resolve(res);
          })
          .end(buffer);
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        type: isVideo ? "VIDEO" : "IMAGE",
      },
    });
  } catch (err) {
    console.error("Review media upload error:", err);
    return NextResponse.json({ success: false, message: "Upload failed." }, { status: 500 });
  }
}
