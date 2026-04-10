const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DONATION_COOLDOWN_DAYS = 90;

function parseDateOrThrow(dateString: string): Date {
  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date string");
  }

  return parsedDate;
}

function getUtcStartOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function calculateDaysSince(dateString: string): number {
  const inputDate = parseDateOrThrow(dateString);
  const today = new Date();

  const inputDayUtc = getUtcStartOfDay(inputDate);
  const todayUtc = getUtcStartOfDay(today);

  return Math.floor((todayUtc - inputDayUtc) / MS_PER_DAY);
}

export function calculateNextEligibleDate(lastDonationDate: string): string {
  const lastDonation = parseDateOrThrow(lastDonationDate);
  const nextEligible = new Date(lastDonation.getTime());

  nextEligible.setUTCDate(nextEligible.getUTCDate() + DONATION_COOLDOWN_DAYS);

  return nextEligible.toISOString();
}

export function isEligibleToDonate(lastDonationDate: string): boolean {
  return calculateDaysSince(lastDonationDate) >= DONATION_COOLDOWN_DAYS;
}
