type ChurnInput = {
  donorId: string;
  donationCount: number;
  lastDonationDaysAgo: number;
};

type ChurnStatus = "ACTIVE" | "AT_RISK";

type ReadinessInput = {
  donorId: string;
  donationCount: number;
  lastDonationDaysAgo: number;
  distance: number;
};

type ReadinessTier = "HIGH" | "MEDIUM" | "LOW";

type ReadinessResponse = {
  score: number;
  tier: ReadinessTier;
};

const ML_BASE_URL = "http://localhost:8000";

export async function getChurnStatus(data: ChurnInput): Promise<ChurnStatus> {
  try {
    const response = await fetch(`${ML_BASE_URL}/ml/churn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return "ACTIVE";
    }

    const result = (await response.json()) as { status?: ChurnStatus };
    return result.status === "AT_RISK" ? "AT_RISK" : "ACTIVE";
  } catch {
    return "ACTIVE";
  }
}

export async function getReadinessScore(
  data: ReadinessInput
): Promise<ReadinessResponse> {
  try {
    const response = await fetch(`${ML_BASE_URL}/ml/readiness`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      return { score: 50, tier: "MEDIUM" };
    }

    const result = (await response.json()) as Partial<ReadinessResponse>;
    const score = typeof result.score === "number" ? result.score : 50;
    const tier: ReadinessTier =
      result.tier === "HIGH" || result.tier === "LOW" || result.tier === "MEDIUM"
        ? result.tier
        : "MEDIUM";

    return { score, tier };
  } catch {
    return { score: 50, tier: "MEDIUM" };
  }
}
