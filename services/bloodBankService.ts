import { getRequestById } from "@/lib/db/requests";
import { getEligibleDonors } from "@/lib/db/donors";
import { checkDonationEligibility } from "@/lib/utils/eligibilityUtils";
import { calculateDaysSince } from "@/lib/utils/dateUtils";
import { calculateDistance } from "@/lib/utils/distanceUtils";
import { getReadinessScore } from "@/services/mlService";

type PriorityDonor = {
  donorId: string;
  name: string;
  phoneNumber: string;
  bloodGroup: string;
  city: string;
  daysSinceLastDonation: number;
  distance: number;
  readinessScore: number;
  tier: "HIGH" | "MEDIUM" | "LOW";
};

const DEFAULT_DAYS_SINCE_LAST_DONATION = 90;

export async function generatePriorityDonorList(
  requestId: string
): Promise<PriorityDonor[]> {
  const request = await getRequestById(requestId);

  if (!request) {
    throw new Error("Request not found");
  }

  const { bloodGroup, city } = request;
  const donors = await getEligibleDonors(bloodGroup, city);

  const eligibleDonors = donors.filter((donor) =>
    checkDonationEligibility(donor.lastDonationDate)
  );

  const priorityDonors = await Promise.all(
    eligibleDonors.map(async (donor) => {
      const daysSinceLastDonation =
        donor.lastDonationDate === null
          ? DEFAULT_DAYS_SINCE_LAST_DONATION
          : calculateDaysSince(donor.lastDonationDate);

      const distance = calculateDistance(donor.city, city);

      const readiness = await getReadinessScore({
        donorId: donor.id,
        donationCount: donor.donationCount,
        lastDonationDaysAgo: daysSinceLastDonation,
        distance,
      });

      return {
        donorId: donor.id,
        name: donor.name,
        phoneNumber: donor.phoneNumber,
        bloodGroup: donor.bloodGroup,
        city: donor.city,
        daysSinceLastDonation,
        distance,
        readinessScore: readiness.score,
        tier: readiness.tier,
      };
    })
  );

  return priorityDonors.sort((a, b) => b.readinessScore - a.readinessScore);
}
