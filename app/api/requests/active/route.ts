import { getActiveRequestsByCity } from "@/services/requestService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const city = request.nextUrl.searchParams.get("city");

    if (!city) {
      return NextResponse.json(
        {
          success: false,
          error: "city is required",
        },
        { status: 400 }
      );
    }

    const requests = await getActiveRequestsByCity(city);

    return NextResponse.json({
      success: true,
      data: requests,
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
