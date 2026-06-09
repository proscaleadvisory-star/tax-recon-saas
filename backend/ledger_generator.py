"""
ledger_generator.py
===================
Synthetic Ledger Data Factory for Pre-Close Auditor Validation

Generates:
    - 10,000 normal journal entries following realistic PO-cycle posting patterns
    - 50 injected anomalies of 5 distinct types for model validation

Anomaly Types Injected:
    TYPE_1 (10 rows): Duplicate vendor billing within 2-hour window
    TYPE_2 (10 rows): Massive odd-value postings (implausible amounts like $1,234,567.89)
    TYPE_3 (10 rows): Cost center bypass (account code mismatch with authorized center)
    TYPE_4 (10 rows): Weekend/off-hours workflow bypass (posting on Sat/Sun 03:00–05:00)
    TYPE_5 (10 rows): Velocity spikes (12x normal frequency under same vendor+account)

Output:
    DataFrame with all REQUIRED_COLUMNS plus `is_anomaly` (bool) and `anomaly_type` (str)
    for ground truth validation in test_auditor.py.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import List, Tuple

import numpy as np
import pandas as pd


# ── Seed for reproducibility ──────────────────────────────────────────────────
RANDOM_SEED: int = 42
rng = np.random.default_rng(RANDOM_SEED)
random.seed(RANDOM_SEED)

# ── Synthetic dimension pools ─────────────────────────────────────────────────
# Vendor IDs: 50 vendors in a realistic range
VENDOR_POOL: List[str] = [f"VND-{str(i).zfill(4)}" for i in range(1, 51)]

# Account IDs: Chart of accounts (GL codes)
ACCOUNT_POOL: List[str] = [
    "4100", "4200", "4300",  # Revenue accounts
    "5100", "5200", "5300", "5400",  # COGS / Direct costs
    "6100", "6200", "6300", "6400", "6500",  # Opex: G&A, R&D, S&M
    "7100", "7200",  # Finance costs
    "1100", "1200", "1300",  # Current assets
    "2100", "2200",  # Current liabilities
]

# Cost centers with their authorized account prefixes
# (account_id[0] in allowed_account_prefixes)
COST_CENTER_RULES: dict = {
    "CC-SALES": ["4", "5"],      # Sales can post to revenue & COGS
    "CC-FINANCE": ["7", "1", "2"],  # Finance posts to finance/balance sheet
    "CC-OPS": ["5", "6"],        # Ops posts to COGS & Opex
    "CC-IT": ["6"],              # IT only posts to Opex
    "CC-HR": ["6"],              # HR only posts to Opex
}
COST_CENTERS: List[str] = list(COST_CENTER_RULES.keys())

# Typical per-month transaction amount ranges by account type ($ USD)
AMOUNT_RANGES: dict = {
    "4": (500, 150_000),    # Revenue
    "5": (200, 80_000),     # COGS
    "6": (100, 30_000),     # Opex
    "7": (1_000, 50_000),   # Finance
    "1": (500, 200_000),    # Assets
    "2": (500, 100_000),    # Liabilities
}

# Baseline period: Jan 2024 – Dec 2024 (fiscal year)
PERIOD_START = datetime(2024, 1, 2, 9, 0, 0)
PERIOD_END = datetime(2024, 12, 30, 17, 0, 0)

N_NORMAL: int = 10_000
N_ANOMALIES_PER_TYPE: int = 10
ANOMALY_TYPES: List[str] = [
    "duplicate_billing",   # TYPE_1
    "massive_odd_value",   # TYPE_2
    "cost_center_bypass",  # TYPE_3
    "off_hours_posting",   # TYPE_4
    "velocity_spike",      # TYPE_5
]


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def _random_business_timestamp() -> datetime:
    """Generate a random timestamp during business hours (Mon–Fri, 08:00–18:00)."""
    total_seconds = int((PERIOD_END - PERIOD_START).total_seconds())
    while True:
        offset = timedelta(seconds=int(rng.integers(0, total_seconds)))
        ts = PERIOD_START + offset
        # Reject weekends
        if ts.weekday() < 5 and 8 <= ts.hour < 18:
            return ts


def _amount_for_account(account_id: str) -> float:
    """Sample a realistic transaction amount for a given GL account."""
    prefix = account_id[0]
    lo, hi = AMOUNT_RANGES.get(prefix, (100, 10_000))
    # Log-normal distribution — realistic for financial amounts (skewed right)
    mean_log = np.log((lo + hi) / 2)
    sigma_log = 0.6
    amount = rng.lognormal(mean=mean_log, sigma=sigma_log)
    # Clamp to range
    return float(np.clip(amount, lo, hi * 1.5))


def _random_vendor_account_pair() -> Tuple[str, str]:
    """Return a consistent vendor_id / account_id pair (vendor billing pattern)."""
    vendor = rng.choice(VENDOR_POOL)
    account = rng.choice(ACCOUNT_POOL)
    return vendor, account


def _cost_center_for_account(account_id: str) -> str:
    """Return an authorized cost center for the given account (valid mapping)."""
    prefix = account_id[0]
    valid_ccs = [cc for cc, prefixes in COST_CENTER_RULES.items() if prefix in prefixes]
    if valid_ccs:
        return random.choice(valid_ccs)
    return random.choice(COST_CENTERS)  # fallback


# ══════════════════════════════════════════════════════════════════════════════
# NORMAL TRANSACTION GENERATOR
# ══════════════════════════════════════════════════════════════════════════════

def _generate_normal_transactions(n: int = N_NORMAL) -> pd.DataFrame:
    """
    Generate n realistic, normal ledger postings following standard PO-cycle patterns:
    - Business hours only (Mon–Fri 08:00–18:00)
    - Amounts log-normally distributed per account type
    - Valid cost center to account mappings
    - Typical vendor posting frequency (1–3 per week per vendor)
    """
    records = []
    for i in range(n):
        vendor_id, account_id = _random_vendor_account_pair()
        cost_center = _cost_center_for_account(account_id)
        ts = _random_business_timestamp()
        amount = _amount_for_account(account_id)

        records.append({
            "transaction_id": f"TXN-NORM-{str(i+1).zfill(6)}",
            "amount": round(amount, 2),
            "vendor_id": vendor_id,
            "account_id": account_id,
            "cost_center": cost_center,
            "posting_timestamp": ts,
            "is_anomaly": False,
            "anomaly_type": "normal",
        })

    return pd.DataFrame(records)


# ══════════════════════════════════════════════════════════════════════════════
# ANOMALY INJECTORS
# ══════════════════════════════════════════════════════════════════════════════

def _inject_duplicate_billing(n: int = N_ANOMALIES_PER_TYPE) -> pd.DataFrame:
    """
    TYPE_1: Duplicate vendor billing within 2-hour window.
    Same vendor + account + amount posted twice within 1–90 minutes of each other.
    This simulates a duplicate invoice being processed in the AP system.
    """
    records = []
    for i in range(n):
        vendor_id, account_id = _random_vendor_account_pair()
        cost_center = _cost_center_for_account(account_id)
        amount = _amount_for_account(account_id)
        base_ts = _random_business_timestamp()
        # Second posting: 1–90 minutes later (within 2-hour detection window)
        offset_minutes = rng.integers(1, 90)
        dup_ts = base_ts + timedelta(minutes=int(offset_minutes))

        # Original post (normal)
        records.append({
            "transaction_id": f"TXN-DUP-{str(i+1).zfill(4)}a",
            "amount": round(amount, 2),
            "vendor_id": vendor_id,
            "account_id": account_id,
            "cost_center": cost_center,
            "posting_timestamp": base_ts,
            "is_anomaly": True,
            "anomaly_type": "duplicate_billing",
        })
        # Duplicate post (flagged)
        records.append({
            "transaction_id": f"TXN-DUP-{str(i+1).zfill(4)}b",
            "amount": round(amount, 2),  # identical amount
            "vendor_id": vendor_id,
            "account_id": account_id,
            "cost_center": cost_center,
            "posting_timestamp": dup_ts,
            "is_anomaly": True,
            "anomaly_type": "duplicate_billing",
        })

    return pd.DataFrame(records)


def _inject_massive_odd_values(n: int = N_ANOMALIES_PER_TYPE) -> pd.DataFrame:
    """
    TYPE_2: Implausibly large odd-value postings.
    Amounts chosen to be far outside the typical range AND with unusual decimal endings
    (e.g., $1,234,567.89 or $999,999.99) — signals potential data entry error or fraud.
    """
    records = []
    ODD_AMOUNTS = [
        1_234_567.89, 999_999.99, 2_500_000.01, 777_777.77,
        3_141_592.65, 1_111_111.11, 4_567_890.00, 666_666.66,
        8_888_888.88, 1_000_001.00,
    ]
    for i in range(n):
        vendor_id, account_id = _random_vendor_account_pair()
        cost_center = _cost_center_for_account(account_id)
        ts = _random_business_timestamp()
        amount = ODD_AMOUNTS[i % len(ODD_AMOUNTS)]

        records.append({
            "transaction_id": f"TXN-ODD-{str(i+1).zfill(4)}",
            "amount": amount,
            "vendor_id": vendor_id,
            "account_id": account_id,
            "cost_center": cost_center,
            "posting_timestamp": ts,
            "is_anomaly": True,
            "anomaly_type": "massive_odd_value",
        })

    return pd.DataFrame(records)


def _inject_cost_center_bypasses(n: int = N_ANOMALIES_PER_TYPE) -> pd.DataFrame:
    """
    TYPE_3: Cost center bypass — GL account posted to a non-authorized cost center.
    E.g., a revenue account (4xxx) posted from IT cost center (CC-IT, only authorized for 6xxx).
    This signals a workflow control bypass in the ERP routing rules.
    """
    records = []
    for i in range(n):
        vendor_id = rng.choice(VENDOR_POOL)
        account_id = rng.choice(ACCOUNT_POOL)
        ts = _random_business_timestamp()
        amount = _amount_for_account(account_id)
        prefix = account_id[0]

        # Force an INVALID cost center for this account
        invalid_ccs = [
            cc for cc, prefixes in COST_CENTER_RULES.items()
            if prefix not in prefixes
        ]
        if not invalid_ccs:
            invalid_ccs = COST_CENTERS  # fallback

        cost_center = random.choice(invalid_ccs)

        records.append({
            "transaction_id": f"TXN-CCB-{str(i+1).zfill(4)}",
            "amount": round(amount, 2),
            "vendor_id": vendor_id,
            "account_id": account_id,
            "cost_center": cost_center,
            "posting_timestamp": ts,
            "is_anomaly": True,
            "anomaly_type": "cost_center_bypass",
        })

    return pd.DataFrame(records)


def _inject_off_hours_postings(n: int = N_ANOMALIES_PER_TYPE) -> pd.DataFrame:
    """
    TYPE_4: Weekend / late-night postings (workflow bypass).
    Transactions posted on Saturday/Sunday between 02:00–05:00 AM — outside any
    standard posting window, suggesting an automated script bypass or insider threat.
    """
    records = []
    count = 0
    attempt = 0
    while count < n and attempt < 10_000:
        attempt += 1
        total_seconds = int((PERIOD_END - PERIOD_START).total_seconds())
        offset = timedelta(seconds=int(rng.integers(0, total_seconds)))
        ts = PERIOD_START + offset

        # Weekend (Sat=5, Sun=6) AND between 02:00 and 05:00
        if ts.weekday() >= 5 and 2 <= ts.hour < 5:
            vendor_id, account_id = _random_vendor_account_pair()
            cost_center = _cost_center_for_account(account_id)
            amount = _amount_for_account(account_id)

            records.append({
                "transaction_id": f"TXN-OOH-{str(count+1).zfill(4)}",
                "amount": round(amount, 2),
                "vendor_id": vendor_id,
                "account_id": account_id,
                "cost_center": cost_center,
                "posting_timestamp": ts,
                "is_anomaly": True,
                "anomaly_type": "off_hours_posting",
            })
            count += 1

    return pd.DataFrame(records)


def _inject_velocity_spikes(n: int = N_ANOMALIES_PER_TYPE) -> pd.DataFrame:
    """
    TYPE_5: Transaction frequency spike — 12× normal posting rate.
    A single vendor+account pair posts n×12 transactions within a 6-hour window,
    far exceeding normal daily velocity (typically 1–3 per week per vendor).
    This pattern signals automated fraud or a runaway batch job.
    """
    records = []
    for i in range(n):
        vendor_id, account_id = _random_vendor_account_pair()
        cost_center = _cost_center_for_account(account_id)
        amount = _amount_for_account(account_id)
        # Cluster all 12 transactions in a 6-hour window
        base_ts = _random_business_timestamp()
        window_minutes = 360  # 6 hours

        for j in range(12):  # 12x normal velocity = velocity spike
            offset_min = rng.integers(0, window_minutes)
            ts = base_ts + timedelta(minutes=int(offset_min))
            # Amount varies slightly (±5%) to avoid exact-duplicate detection
            jitter = 1.0 + rng.uniform(-0.05, 0.05)

            records.append({
                "transaction_id": f"TXN-VEL-{str(i+1).zfill(3)}-{str(j+1).zfill(2)}",
                "amount": round(amount * jitter, 2),
                "vendor_id": vendor_id,
                "account_id": account_id,
                "cost_center": cost_center,
                "posting_timestamp": ts,
                "is_anomaly": True,
                "anomaly_type": "velocity_spike",
            })

    return pd.DataFrame(records)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN FACTORY FUNCTION
# ══════════════════════════════════════════════════════════════════════════════

def generate_ledger_dataset(
    n_normal: int = N_NORMAL,
    n_per_anomaly_type: int = N_ANOMALIES_PER_TYPE,
    shuffle: bool = True,
    random_seed: int = RANDOM_SEED,
) -> pd.DataFrame:
    """
    Generate a synthetic labelled ledger dataset for model training and validation.

    Args:
        n_normal:             Number of normal baseline transactions (default 10,000)
        n_per_anomaly_type:   Number of anomalies per type (default 10, total 50+)
        shuffle:              Whether to shuffle the final dataset
        random_seed:          Random seed for reproducibility

    Returns:
        pd.DataFrame with columns:
            transaction_id, amount, vendor_id, account_id, cost_center,
            posting_timestamp, is_anomaly (bool), anomaly_type (str)

    Anomaly breakdown (with n_per_anomaly_type=10):
        duplicate_billing:   20 rows (10 original + 10 duplicate)
        massive_odd_value:   10 rows
        cost_center_bypass:  10 rows
        off_hours_posting:   10 rows (may be fewer if calendar sampling fails)
        velocity_spike:      120 rows (10 groups × 12 posts each)
        ─────────────────────────────
        Total anomaly rows:  ~170
        Total normal rows:   10,000
        Contamination rate:  ~1.7%
    """
    np.random.seed(random_seed)
    random.seed(random_seed)

    print(f"[generator] Generating {n_normal} normal transactions...")
    normal_df = _generate_normal_transactions(n_normal)

    print("[generator] Injecting anomalies...")
    dup_df = _inject_duplicate_billing(n_per_anomaly_type)
    odd_df = _inject_massive_odd_values(n_per_anomaly_type)
    ccb_df = _inject_cost_center_bypasses(n_per_anomaly_type)
    ooh_df = _inject_off_hours_postings(n_per_anomaly_type)
    vel_df = _inject_velocity_spikes(n_per_anomaly_type)

    full_df = pd.concat([normal_df, dup_df, odd_df, ccb_df, ooh_df, vel_df], ignore_index=True)

    if shuffle:
        full_df = full_df.sample(frac=1, random_state=random_seed).reset_index(drop=True)

    total = len(full_df)
    anomaly_count = full_df["is_anomaly"].sum()
    print(
        f"[generator] Dataset ready: {total:,} rows | "
        f"{anomaly_count} anomalies ({anomaly_count/total*100:.2f}% contamination)"
    )
    print(f"[generator] Anomaly breakdown:\n{full_df[full_df['is_anomaly']]['anomaly_type'].value_counts()}")
    return full_df


def generate_training_data(n_normal: int = N_NORMAL) -> pd.DataFrame:
    """
    Generate training data (normal transactions only — as expected for unsupervised training).
    Returns the raw ledger columns without labels.
    """
    df = _generate_normal_transactions(n_normal)
    # Drop label columns — training should be on unlabelled data
    return df.drop(columns=["is_anomaly", "anomaly_type"])


def generate_audit_batch(n_normal: int = 200, inject_anomalies: bool = True) -> pd.DataFrame:
    """
    Generate a small mixed batch for audit testing.
    Returns with labels for validation but labels are NOT sent to the model.
    """
    return generate_ledger_dataset(
        n_normal=n_normal,
        n_per_anomaly_type=2,  # 2 per type = ~10 total anomalies in batch
        shuffle=True,
    )


if __name__ == "__main__":
    # Run standalone to preview the dataset
    df = generate_ledger_dataset()
    print(df.head(10).to_string())
    print(f"\nSchema: {list(df.columns)}")
    print(f"Dtypes:\n{df.dtypes}")
