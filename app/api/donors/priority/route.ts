import { NextResponse } from "next/server";
import { generatePriorityDonorList } from "@/services/bloodBankService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Missing requestId parameter" },
        { status: 400 }
      );
    }

    const priorityDonors = await generatePriorityDonorList(requestId);

    return NextResponse.json({
      success: true,
      donors: priorityDonors,
    });
  } catch (error: any) {
    console.error("Failed to generate priority donor list:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate priority donors" },
      { status: 500 }
    );
  }
}
