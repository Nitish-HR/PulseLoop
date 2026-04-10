import { NextRequest, NextResponse } from "next/server";
import { getInventory, updateInventory } from "@/lib/db/inventory";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bloodBankId, bloodGroup, units } = body;

    if (!bloodBankId || !bloodGroup || typeof units !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid payload parameters." },
        { status: 400 }
      );
    }

    if (units <= 0) {
      return NextResponse.json(
        { error: "Units to withdraw must be greater than 0." },
        { status: 400 }
      );
    }

    const inventoryRecords = await getInventory(bloodBankId);
    const existingRecord = inventoryRecords.find(
      (record) => record.bloodGroup === bloodGroup
    );

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Stock does not exist for this blood group." },
        { status: 400 }
      );
    }

    if (existingRecord.unitsAvailable < units) {
      return NextResponse.json(
        { error: "Insufficient stock." },
        { status: 400 }
      );
    }

    const newTotal = existingRecord.unitsAvailable - units;
    const updated = await updateInventory(bloodBankId, bloodGroup, newTotal);
    
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
