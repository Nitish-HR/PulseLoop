import { NextRequest, NextResponse } from "next/server";
import { buildDonorDashboard } from "@/services/donorService";

export async function GET(request: NextRequest) {
  try {
    const donorId = request.nextUrl.searchParams.get("donorId");

    if (!donorId) {
      return NextResponse.json(
        {
          success: false,
          error: "donorId is required",
        },
        { status: 400 }
      );
    }

    const dashboardData = await buildDonorDashboard(donorId);

    return NextResponse.json({
      success: true,
      data: dashboardData,
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
