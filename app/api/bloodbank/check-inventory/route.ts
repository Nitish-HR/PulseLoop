import { NextRequest, NextResponse } from "next/server";
import { getInventory } from "@/lib/db/inventory";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bloodGroup, unitsRequired, bloodBankId } = body;

    if (!bloodGroup || !unitsRequired || !bloodBankId) {
      return NextResponse.json(
        { error: "Missing required fields: bloodGroup, unitsRequired, bloodBankId" },
        { status: 400 }
      );
    }

    const inventory = await getInventory(bloodBankId);
    const specificBloodRecord = inventory.find(
      (item) => item.bloodGroup === bloodGroup
    );

    const unitsAvailable = specificBloodRecord ? specificBloodRecord.unitsAvailable : 0;
    const isAvailable = unitsAvailable >= unitsRequired;

    return NextResponse.json({
      status: isAvailable ? "AVAILABLE" : "NOT_AVAILABLE",
      unitsAvailable,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
