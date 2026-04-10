export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("GOOGLE_MAPS_API_KEY is missing from environment variables.");
      return { lat: 0, lng: 0 };
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      console.error("Geocoding failed:", data.status, data.error_message);
      return { lat: 0, lng: 0 };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    return { lat: 0, lng: 0 };
  }
}
