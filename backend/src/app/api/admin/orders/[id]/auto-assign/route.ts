import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { autoAssignDeliveryPartner } from "@/lib/delivery-assignment";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const assignment = await autoAssignDeliveryPartner(id);

    if (!assignment) {
      return NextResponse.json(
        { error: "No active delivery partner available in sequence pool." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Order assigned sequence-wise to ${assignment.agent?.name}.`,
      assignment,
    });
  } catch (error: any) {
    console.error("Auto assign route error:", error);
    return NextResponse.json(
      { error: "Failed to auto-assign delivery partner: " + (error?.message || "") },
      { status: 500 }
    );
  }
}
