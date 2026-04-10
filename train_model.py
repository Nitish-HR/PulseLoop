import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
import joblib
import io

# =============================================================
# REAL DATA — UCI Blood Transfusion Dataset
# =============================================================

raw_csv = """Recency (months),Frequency (times),Monetary (c.c. blood),Time (months),whether he/she donated blood in March 2007
2,50,12500,98,1
0,13,3250,28,1
1,16,4000,35,1"""

# Load from file instead
df_real = pd.read_csv("transfusion.csv")
df_real.columns = ["R", "F", "M", "T", "Target"]
df_real = df_real.drop(columns=["M"])

# Feature mapping
df_real["days_since_last_donation"] = df_real["R"] * 30
df_real["total_donations"] = df_real["F"]
df_real["avg_gap_between_donations"] = ((df_real["T"] / df_real["F"]) * 30).fillna(90)
df_real["churned"] = 1 - df_real["Target"]

# Smarter responded_to_alerts — based on frequency, not random
df_real["responded_to_alerts"] = (df_real["total_donations"] >= 5).astype(int)

df_real = df_real[[
    "days_since_last_donation",
    "total_donations",
    "avg_gap_between_donations",
    "responded_to_alerts",
    "churned"
]]

print(f"Real data: {len(df_real)} rows")
print(f"Real churn rate: {df_real['churned'].mean():.2%}")

# =============================================================
# SYNTHETIC DATA — more nuanced churn rules
# =============================================================

np.random.seed(42)
n = 600

days = np.random.randint(30, 400, n)
donations = np.random.randint(1, 15, n)
gap = np.random.randint(30, 200, n)
responded = (donations >= 5).astype(int)  # consistent with real data logic

# Nuanced churn rule — catches more at-risk patterns
churned = (
    ((days > 180) & (donations < 3) & (responded == 0)) |
    ((days > 300) & (donations < 5))
).astype(int)

df_syn = pd.DataFrame({
    "days_since_last_donation": days,
    "total_donations": donations,
    "avg_gap_between_donations": gap,
    "responded_to_alerts": responded,
    "churned": churned
})

print(f"Synthetic data: {len(df_syn)} rows")
print(f"Synthetic churn rate: {df_syn['churned'].mean():.2%}")

# =============================================================
# COMBINE
# =============================================================

df = pd.concat([df_real, df_syn], ignore_index=True)
print(f"Combined: {len(df)} rows, churn rate: {df['churned'].mean():.2%}")

# =============================================================
# TRAIN
# =============================================================

X = df.drop(columns=["churned"])
y = df["churned"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    class_weight="balanced",  # handles imbalance
    random_state=42
)
model.fit(X_train, y_train)

# =============================================================
# EVALUATE — properly
# =============================================================

y_pred = model.predict(X_test)
print(f"\nAccuracy: {accuracy_score(y_test, y_pred):.2%}")
print("\nFull report:")
print(classification_report(y_test, y_pred, target_names=["Active", "Churned"]))

# Cross-validation for confidence
cv_scores = cross_val_score(model, X, y, cv=5, scoring="recall")
print(f"\nCross-val recall (churned): {cv_scores.mean():.2%} (+/- {cv_scores.std():.2%})")

# Feature importance — good for explaining to judges
print("\nFeature importance:")
for feat, imp in sorted(zip(X.columns, model.feature_importances_), key=lambda x: -x[1]):
    print(f"  {feat}: {imp:.3f}")

# =============================================================
# SAVE
# =============================================================

joblib.dump(model, "model.pkl")
print("\nmodel.pkl saved. Run main.py to start the API.")