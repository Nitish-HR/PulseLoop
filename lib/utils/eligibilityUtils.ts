import { calculateDaysSince } from "@/lib/utils/dateUtils";

const MIN_DAYS_BETWEEN_DONATIONS = 90;

export function checkDonationEligibility(lastDonationDate: string | null): boolean {
  if (lastDonationDate === null) {
    return true;
  }

  return calculateDaysSince(lastDonationDate) >= MIN_DAYS_BETWEEN_DONATIONS;
}

export function filterEligibleDonors(donors: any[]): any[] {
  return donors.filter((donor) =>
    checkDonationEligibility(donor.lastDonationDate ?? null)
  );
}
