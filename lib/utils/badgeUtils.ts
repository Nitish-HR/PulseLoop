import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type BadgeType =
  | "FIRST_DONATION"
  | "STREAK_3"
  | "STREAK_5"
  | "BRONZE_3"
  | "SILVER_5"
  | "GOLD_10";

export const BADGE_META: Record<BadgeType, { label: string; emoji: string; description: string }> = {
  FIRST_DONATION: { label: "First Drop", emoji: "🩸", description: "Made their very first donation" },
  STREAK_3:       { label: "Hat-Trick",  emoji: "🔥", description: "3 donations in a row" },
  STREAK_5:       { label: "On Fire",    emoji: "⚡", description: "5-donation streak achieved" },
  BRONZE_3:       { label: "Bronze Hero",emoji: "🥉", description: "Donated 3+ times total" },
  SILVER_5:       { label: "Silver Hero",emoji: "🥈", description: "Donated 5+ times total" },
  GOLD_10:        { label: "Gold Hero",  emoji: "🥇", description: "Donated 10+ times — legend!" },
};

export async function checkAndAwardBadges(
  donorId: string,
  donationCount: number,
  streakCount: number
): Promise<void> {
  const badgesRef = collection(db, "badges");

  const existingSnap = await getDocs(
    query(badgesRef, where("donorId", "==", donorId))
  );
  const earnedBadges = new Set(existingSnap.docs.map((d) => d.data().badgeType as BadgeType));

  const toAward: BadgeType[] = [];

  if (donationCount >= 1  && !earnedBadges.has("FIRST_DONATION")) toAward.push("FIRST_DONATION");
  if (streakCount  >= 3  && !earnedBadges.has("STREAK_3"))        toAward.push("STREAK_3");
  if (streakCount  >= 5  && !earnedBadges.has("STREAK_5"))        toAward.push("STREAK_5");
  if (donationCount >= 3  && !earnedBadges.has("BRONZE_3"))        toAward.push("BRONZE_3");
  if (donationCount >= 5  && !earnedBadges.has("SILVER_5"))        toAward.push("SILVER_5");
  if (donationCount >= 10 && !earnedBadges.has("GOLD_10"))         toAward.push("GOLD_10");

  await Promise.all(
    toAward.map((badgeType) =>
      addDoc(badgesRef, {
        donorId,
        badgeType,
        awardedAt: new Date().toISOString(),
      })
    )
  );
}
