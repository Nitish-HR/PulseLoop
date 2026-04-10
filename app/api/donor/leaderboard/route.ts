import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const snap = await getDocs(collection(db, "donors"));

    const leaderboard = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          donorId: d.id,
          name: data.name || "Anonymous Donor",
          donationCount: data.donationCount || 0,
          streakCount: data.streakCount || 0,
          bloodGroup: data.bloodGroup || "",
          city: data.city || "",
        };
      })
      .filter((d) => d.donationCount > 0)
      .sort((a, b) => b.donationCount - a.donationCount) // guaranteed correct sort
      .slice(0, 10);

    return NextResponse.json({ success: true, leaderboard });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to build leaderboard" },
      { status: 500 }
    );
  }
}
