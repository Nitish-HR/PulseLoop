import { createHospitalRequest } from "@/services/requestService";
import { NextRequest, NextResponse } from "next/server";

type CreateRequestBody = {
  bloodGroup: string;
  unitsRequired: number;
  component: string;
  urgency: "CRITICAL" | "URGENT" | "PLANNED";
  hospitalId: string;
  hospitalName: string;
  city: string;
  contactName: string;
  contactNumber: string;
};

function isValidRequestBody(body: unknown): body is CreateRequestBody {
  if (!body || typeof body !== "object") {
    return false;
  }

  const data = body as Record<string, unknown>;

  return (
    typeof data.bloodGroup === "string" &&
    typeof data.unitsRequired === "number" &&
    typeof data.component === "string" &&
    (data.urgency === "CRITICAL" || data.urgency === "URGENT" || data.urgency === "PLANNED") &&
    typeof data.hospitalId === "string" &&
    typeof data.hospitalName === "string" &&
    typeof data.city === "string" &&
    typeof data.contactName === "string" &&
    typeof data.contactNumber === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!isValidRequestBody(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 }
      );
    }

    const createdId = await createHospitalRequest(body);

    return NextResponse.json({
      success: true,
      requestId: createdId,
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
