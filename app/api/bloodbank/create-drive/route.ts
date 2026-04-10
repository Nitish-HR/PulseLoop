import { NextRequest, NextResponse } from "next/server";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bloodBankId,
      title,
      purpose,
      date,
      time,
      location,
      contactName,
      contactNumber,
      targetAudience,
    } = body;

    if (!bloodBankId || !title || !date || !time || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const drivesCollection = collection(db, "bloodDrives");
    const docRef = await addDoc(drivesCollection, {
      bloodBankId,
      title,
      purpose: purpose || "",
      date,
      time,
      location,
      contactName: contactName || "",
      contactNumber: contactNumber || "",
      targetAudience: targetAudience || "",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, docId: docRef.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
