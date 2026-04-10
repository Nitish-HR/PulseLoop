import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { geocode } from "@/lib/utils/geocode";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hospitalId, address } = body;

    if (!hospitalId || !address) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const coords = await geocode(address);

    const hospitalRef = doc(db, "hospitals", hospitalId);
    
    await updateDoc(hospitalRef, {
      address,
      lat: coords?.lat || 0,
      lng: coords?.lng || 0,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
