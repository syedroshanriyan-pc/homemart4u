import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Image ID is required" }, { status: 400 });
    }

    const media = await prisma.uploadedMedia.findUnique({
      where: { id },
    });

    if (!media) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const buffer = Buffer.from(media.dataBase64, "base64");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(media.sizeBytes || buffer.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      },
    });
  } catch (error) {
    console.error("Fetch uploaded media error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
