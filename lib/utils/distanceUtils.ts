export function calculateDistance(donorCity: string, requestCity: string): number {
  const normalizedDonorCity = donorCity.trim().toLowerCase();
  const normalizedRequestCity = requestCity.trim().toLowerCase();

  return normalizedDonorCity === normalizedRequestCity ? 0 : 1;
}
