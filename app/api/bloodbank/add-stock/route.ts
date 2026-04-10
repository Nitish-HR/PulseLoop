import { NextRequest, NextResponse } from "next/server";
import { getInventory, updateInventory } from "@/lib/db/inventory";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
        { error: "Units to add must be greater than 0." },
        { status: 400 }
      );
    }

    const inventoryRecords = await getInventory(bloodBankId);
    const existingRecord = inventoryRecords.find(
      (record) => record.bloodGroup === bloodGroup
    );

    if (existingRecord) {
      // Increment logic using existing DB abstraction
      const newTotal = existingRecord.unitsAvailable + units;
      const updated = await updateInventory(bloodBankId, bloodGroup, newTotal);
      return NextResponse.json({ success: true, data: updated });
    } else {
      // Create new exact document for the bloodGroup using Firestore native add
      const inventoryCollection = collection(db, "inventory");
      const docRef = await addDoc(inventoryCollection, {
        bloodBankId,
        bloodGroup,
        unitsAvailable: units,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, docId: docRef.id });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
