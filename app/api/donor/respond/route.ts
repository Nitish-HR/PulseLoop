import { createDonorResponse } from "@/lib/db/responses";
import { NextRequest, NextResponse } from "next/server";

type RespondBody = {
  donorId?: string;
  requestId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RespondBody;
    const { donorId, requestId } = body;

    if (!donorId || !requestId) {
      return NextResponse.json(
        {
          success: false,
          error: "donorId and requestId are required",
        },
        { status: 400 }
      );
    }

    await createDonorResponse(donorId, requestId, "RESPONDED");

    return NextResponse.json({
      success: true,
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
