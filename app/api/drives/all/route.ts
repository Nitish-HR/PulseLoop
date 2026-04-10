import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const bloodBankId = request.nextUrl.searchParams.get("bloodBankId");
    
    const drivesCollection = collection(db, "bloodDrives");
    const q = query(drivesCollection);
    const querySnapshot = await getDocs(q);

    let drives = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // If param is provided, isolate the mapping (useful for the creator's respective dashboard)
    if (bloodBankId) {
      drives = drives.filter((drive) => drive.bloodBankId === bloodBankId);
    }

    // Sort heavily purely on natively parsed date parameters to avoid Firebase Index limits
    drives.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
      const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
      return dateA.getTime() - dateB.getTime();
    });

    return NextResponse.json({ success: true, data: drives });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
