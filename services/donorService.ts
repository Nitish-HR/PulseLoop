import { getDonorById } from "@/lib/db/donors";
import { countDonorResponses } from "@/lib/db/responses";
import {
  calculateDaysSince,
  calculateNextEligibleDate,
} from "@/lib/utils/dateUtils";
import { getChurnStatus } from "@/services/mlService";

type EligibilityStatus = "ELIGIBLE" | "NOT_ELIGIBLE";

type DonorDashboard = {
  eligibilityStatus: EligibilityStatus;
  nextEligibleDate: string;
  donationCount: number;
  streakCount: number;
  churnStatus: "ACTIVE" | "AT_RISK";
  livesImpacted: number;
  activeRequestCount: number;
};

const DONATION_COOLDOWN_DAYS = 90;

export async function buildDonorDashboard(donorId: string): Promise<DonorDashboard> {
  const donor = await getDonorById(donorId);

  if (!donor) {
    throw new Error("Donor not found");
  }

  const donationCount = donor.donationCount;
  const streakCount = donor.streakCount;
  const lastDonationDate = donor.lastDonationDate;

  const daysSinceLastDonation =
    lastDonationDate === null ? DONATION_COOLDOWN_DAYS : calculateDaysSince(lastDonationDate);

  const eligibilityStatus: EligibilityStatus =
    daysSinceLastDonation >= DONATION_COOLDOWN_DAYS ? "ELIGIBLE" : "NOT_ELIGIBLE";

  const nextEligibleDate =
    lastDonationDate === null
      ? new Date().toISOString()
      : calculateNextEligibleDate(lastDonationDate);

  const livesImpacted = await countDonorResponses(donorId);

  const churnStatus = await getChurnStatus({
    donorId,
    donationCount,
    lastDonationDaysAgo: daysSinceLastDonation,
  });

  return {
    eligibilityStatus,
    nextEligibleDate,
    donationCount,
    streakCount,
    churnStatus,
    livesImpacted,
    activeRequestCount: 0,
  };
}
