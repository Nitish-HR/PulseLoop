import { NextRequest, NextResponse } from "next/server";
import { getInventory } from "@/lib/db/inventory";

const ALL_BLOOD_GROUPS = [
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "O_POS",
  "O_NEG",
  "AB_POS",
  "AB_NEG",
];

export async function GET(request: NextRequest) {
  try {
    const bloodBankId = request.nextUrl.searchParams.get("bloodBankId");

    if (!bloodBankId) {
      return NextResponse.json(
        { error: "Missing required parameter: bloodBankId" },
        { status: 400 }
      );
    }

    const inventoryRecords = await getInventory(bloodBankId);

    // Map existing records over all required blood groups
    const normalizedInventory = ALL_BLOOD_GROUPS.map((bg) => {
      const match = inventoryRecords.find((record) => record.bloodGroup === bg);
      return {
        bloodGroup: bg,
        unitsAvailable: match ? match.unitsAvailable : 0,
      };
    });

    return NextResponse.json({
      inventory: normalizedInventory,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
