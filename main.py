import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="PulseLoop ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup
model = joblib.load("model.pkl")

# =============================================================
# REQUEST MODELS
# =============================================================

class ChurnRequest(BaseModel):
    donationCount: int
    lastDonationDaysAgo: int
    avgGapBetweenDonations: int  # added — no more hardcoding

class ReadinessRequest(BaseModel):
    donationCount: int
    lastDonationDaysAgo: int
    distance: float
    respondedToPastRequests: int  # added — no more hardcoding

# =============================================================
# ENDPOINT 1: CHURN (ML model)
# =============================================================

@app.post("/ml/churn")
def churn(data: ChurnRequest):
    try:
        responded = 1 if data.donationCount >= 5 else 0

        X = [[
            data.lastDonationDaysAgo,
            data.donationCount,
            data.avgGapBetweenDonations,
            responded
        ]]

        prediction = model.predict(X)[0]
        probability = model.predict_proba(X)[0][1]

        if probability >= 0.7:
            churn_status = "AT_RISK"
        elif probability >= 0.4:
            churn_status = "MODERATE"
        else:
            churn_status = "ACTIVE"

        return {
            "success": True,
            "data": {
                "churnStatus": churn_status,
                "probability": round(float(probability), 2)
            },
            "error": None
        }

    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

# =============================================================
# ENDPOINT 2: READINESS SCORE (deterministic — intentional)
# =============================================================

@app.post("/ml/readiness")
def readiness(data: ReadinessRequest):
    try:
        score = 0

        # Recency (40 pts) — must be 90+ days to be eligible at all
        if data.lastDonationDaysAgo == 0:
            score += 0  # never donated
        elif data.lastDonationDaysAgo < 90:
            score += 0  # not eligible yet
        elif data.lastDonationDaysAgo < 120:
            score += 40
        elif data.lastDonationDaysAgo < 180:
            score += 30
        else:
            score += 20

        # Frequency (30 pts)
        if data.donationCount >= 10:
            score += 30
        elif data.donationCount >= 5:
            score += 20
        elif data.donationCount >= 2:
            score += 10
        else:
            score += 5

        # Response history (20 pts)
        if data.respondedToPastRequests >= 3:
            score += 20
        elif data.respondedToPastRequests >= 1:
            score += 10
        else:
            score += 0

        # Distance (10 pts)
        if data.distance <= 2:
            score += 10
        elif data.distance <= 5:
            score += 7
        elif data.distance <= 10:
            score += 4
        else:
            score += 1

        # Tier
        if score >= 70:
            tier = "HIGH"
        elif score >= 40:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        return {
            "success": True,
            "data": {
                "score": score,
                "tier": tier,
                "breakdown": {
                    "recency": score,  # teammates can ignore breakdown if needed
                    "eligible": data.lastDonationDaysAgo >= 90
                }
            },
            "error": None
        }

    except Exception as e:
        return {"success": False, "data": None, "error": str(e)}

# =============================================================
# HEALTH CHECK
# =============================================================

@app.get("/")
def root():
    return {"status": "PulseLoop ML API is running", "endpoints": ["/ml/churn", "/ml/readiness"]}