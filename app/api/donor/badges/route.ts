import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BADGE_META, checkAndAwardBadges } from "@/lib/utils/badgeUtils";
import { getDonorById } from "@/lib/db/donors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const donorId = searchParams.get("donorId");

    if (!donorId) {
      return NextResponse.json({ error: "Missing donorId" }, { status: 400 });
    }

    // Backfill: run badge check against current totals so existing donors
    // who donated before badge logic existed get their awards immediately.
    const donor = await getDonorById(donorId);
    if (donor) {
      await checkAndAwardBadges(
        donorId,
        donor.donationCount || 0,
        donor.streakCount || 0
      );
    }

    const snap = await getDocs(
      query(collection(db, "badges"), where("donorId", "==", donorId))
    );

    const badges = snap.docs.map((d) => {
      const data = d.data();
      const meta = BADGE_META[data.badgeType as keyof typeof BADGE_META];
      return {
        id: d.id,
        badgeType: data.badgeType,
        awardedAt: data.awardedAt,
        label: meta?.label || data.badgeType,
        emoji: meta?.emoji || "🏅",
        description: meta?.description || "",
      };
    });

    return NextResponse.json({ success: true, badges });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
