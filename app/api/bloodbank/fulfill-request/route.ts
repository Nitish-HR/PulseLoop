import { NextRequest, NextResponse } from "next/server";
import { updateRequestStatus } from "@/lib/db/requests";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "Missing required field: requestId" },
        { status: 400 }
      );
    }

    // Fulfill the request status in Firestore
    await updateRequestStatus(requestId, "FULFILLED");

    // Optional: Inventory deduction logic can be placed here if bloodBankId is provided
    // Context or session validation could map over to inventory ledger reductions automatically.

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
