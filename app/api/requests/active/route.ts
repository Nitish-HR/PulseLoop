import { getActiveRequestsByCity } from "@/services/requestService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const city = request.nextUrl.searchParams.get("city");
    
    // Pass city as string or undefined
    const requests = await getActiveRequestsByCity(city || undefined);

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
