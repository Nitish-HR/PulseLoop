import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { geocode } from "@/lib/utils/geocode";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { donorId, name, email, city, phoneNumber, bloodGroup, address } = body;

    if (!donorId || !city || !phoneNumber || !bloodGroup || !address) {
      return NextResponse.json(
        { error: "Missing required onboarding fields" },
        { status: 400 }
      );
    }

    const coords = await geocode(address);

    // Force exact document match to the Firebase Auth UID map
    const donorRef = doc(db, "donors", donorId);
    
    await setDoc(donorRef, {
      name: name || "Donor",
      email: email || "",
      city,
      address,
      phoneNumber,
      bloodGroup,
      lat: coords?.lat || 0,
      lng: coords?.lng || 0,
      // Default zero mappings natively parsed below
      donationCount: 0,
      streakCount: 0,
      lastDonationDate: null,
      churnStatus: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, donorId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
