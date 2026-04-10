import { generatePriorityDonorList } from "@/services/bloodBankService";
import { NextRequest, NextResponse } from "next/server";

type GenerateDonorsBody = {
  requestId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateDonorsBody;
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          error: "requestId is required",
        },
        { status: 400 }
      );
    }

    const donorList = await generatePriorityDonorList(requestId);

    return NextResponse.json({
      success: true,
      donors: donorList,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
