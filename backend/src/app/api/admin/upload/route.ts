import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required to upload images." },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    let filename = "product-image.jpg";
    let mimeType = "image/jpeg";
    let sizeBytes = 0;
    let dataBase64 = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided in form data under 'file' key." },
          { status: 400 }
        );
      }

      mimeType = file.type || "application/octet-stream";
      filename = file.name || "uploaded-image";
      sizeBytes = file.size;

      if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
        return NextResponse.json(
          {
            error: `Invalid file format (${mimeType}). Permitted image formats: JPEG, PNG, WEBP, GIF, SVG.`,
          },
          { status: 400 }
        );
      }

      if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File size exceeds the 5MB limit (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB). Please choose a smaller image.`,
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      dataBase64 = buffer.toString("base64");
    } else {
      // JSON body support for base64 uploads or copied data URLs
      const body = await req.json();
      const { dataUrl, base64, name, type } = body || {};

      let rawBase64 = base64;
      if (dataUrl && typeof dataUrl === "string") {
        const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1].toLowerCase();
          rawBase64 = matches[2];
        } else {
          return NextResponse.json(
            { error: "Invalid data URL format. Expected 'data:<mimeType>;base64,<data>'." },
            { status: 400 }
          );
        }
      } else if (type) {
        mimeType = String(type).toLowerCase();
      }

      if (name) {
        filename = String(name);
      }

      if (!rawBase64 || typeof rawBase64 !== "string") {
        return NextResponse.json(
          { error: "Image data (base64 or dataUrl) is required." },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return NextResponse.json(
          {
            error: `Invalid image type (${mimeType}). Permitted formats: JPEG, PNG, WEBP, GIF, SVG.`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(rawBase64, "base64");
      sizeBytes = buffer.length;

      if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `Image size exceeds the 5MB limit (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB).`,
          },
          { status: 400 }
        );
      }

      dataBase64 = rawBase64;
    }

    // Persist permanently in Supabase PostgreSQL
    const media = await prisma.uploadedMedia.create({
      data: {
        filename: filename.slice(0, 255),
        mimeType,
        sizeBytes,
        dataBase64,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "IMAGE_UPLOADED",
        entityType: "UPLOADED_MEDIA",
        entityId: media.id,
        metadataJson: JSON.stringify({
          filename,
          mimeType,
          sizeBytes,
        }),
      },
    });

    const relativeUrl = `/api/uploads/${media.id}`;
    const origin = req.nextUrl?.origin || "";
    const absoluteUrl = origin ? `${origin}${relativeUrl}` : relativeUrl;

    return NextResponse.json({
      success: true,
      mediaId: media.id,
      url: relativeUrl,
      absoluteUrl,
      filename,
      mimeType,
      sizeBytes,
    });
  } catch (error: any) {
    console.error("Admin image upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload image. " + (error?.message || "Internal server error.") },
      { status: 500 }
    );
  }
}
