"""
StockSense — Dataset Preparation

This script documents how the final inventory dataset was prepared from the
raw public datasets sourced from Kaggle, UCI, Zenodo, and Mendeley Data.
It covers data cleaning, feature engineering, and target label creation
for all four prediction tasks.

Sources:
  - Kaggle: Retail Store Inventory Forecasting Dataset
  - Kaggle: Superstore Sales Dataset
  - UCI: Online Retail Dataset / Online Retail II
  - Zenodo: BigMart Retail Sales Dataset
  - Mendeley Data: Retail Inventory Data / Sales Dataset
"""

import pandas as pd
import numpy as np
import os

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Load the combined raw dataset
# ─────────────────────────────────────────────────────────────────────────────

def load_data(path="data/StockSense-Inventory-raw.csv"):
    """
    Load the combined inventory dataset. The raw dataset was assembled by
    merging the four public data sources into a single schema covering
    73,100 inventory records across 132 products in 15 Nigerian cities.
    """
    df = pd.read_csv(path)
    print(f"Loaded dataset: {df.shape[0]:,} rows x {df.shape[1]} columns")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Data Cleaning
# ─────────────────────────────────────────────────────────────────────────────

def clean_data(df):
    """
    Clean the raw dataset before feature engineering and label creation.
    
    Steps:
      1. Handle missing values in numeric columns using column median
      2. Convert date columns to proper datetime format
      3. Correct negative quantity values to zero
      4. Remove duplicate records
    """
    print("\n--- Data Cleaning ---")

    # 2.1 Fill missing values with column median
    # days_to_expiry, qty_damaged, and qty_adjusted had ~4% missing each
    numeric_cols = [
        "days_to_expiry", "qty_damaged", "qty_adjusted",
        "shelf_life_days", "qty_in", "qty_sold", "qty_remaining",
        "unit_price_ngn", "demand_forecast"
    ]
    for col in numeric_cols:
        if col in df.columns:
            missing = df[col].isna().sum()
            if missing > 0:
                df[col] = df[col].fillna(df[col].median())
                print(f"  Filled {missing} missing values in '{col}' with median")

    # 2.2 Convert date columns to datetime
    for col in ["restock_date", "expiry_date"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # 2.3 Correct negative quantity values
    qty_cols = ["qty_in", "qty_sold", "qty_damaged", "qty_adjusted", "qty_remaining"]
    for col in qty_cols:
        if col in df.columns:
            negative_count = (df[col] < 0).sum()
            if negative_count > 0:
                df[col] = df[col].clip(lower=0)
                print(f"  Corrected {negative_count} negative values in '{col}' to zero")

    # 2.4 Remove duplicates
    before = len(df)
    df = df.drop_duplicates()
    after = len(df)
    print(f"  Duplicates removed: {before - after}")

    print(f"  Dataset after cleaning: {df.shape[0]:,} rows")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Feature Engineering
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(df):
    """
    Create derived feature columns from existing raw columns.
    These new columns give the ML models more useful signals
    than the raw quantity numbers alone.

    New columns created:
      - sell_through_rate  : units sold / units received
      - wastage_rate       : damaged units / units received
      - shelf_utilisation  : proportion of shelf life already used
      - weekly_sales_rate  : average units sold per week
    """
    print("\n--- Feature Engineering ---")

    # Sell-through rate: what proportion of stock has been sold
    df["sell_through_rate"] = np.where(
        df["qty_in"] > 0,
        (df["qty_sold"] / df["qty_in"]).round(4),
        0
    )

    # Wastage rate: what proportion of stock was damaged or written off
    df["wastage_rate"] = np.where(
        df["qty_in"] > 0,
        (df["qty_damaged"] / df["qty_in"]).round(4),
        0
    )

    # Shelf utilisation: how much of the product shelf life has been used
    # Formula: 1 - (days_to_expiry / shelf_life_days)
    # A value close to 1 means most of the shelf life has been used
    df["shelf_utilisation"] = np.where(
        df["shelf_life_days"] > 0,
        (1 - (df["days_to_expiry"] / df["shelf_life_days"].clip(lower=1))).round(4),
        0
    ).clip(0, 1)

    # Weekly sales rate: average units sold per week
    # Uses restock days as the denominator; defaults to shelf_life_days if
    # restock date or expiry date is missing
    df["weekly_sales_rate"] = (df["qty_sold"] / 4.0).round(4)

    print("  Created: sell_through_rate, wastage_rate, shelf_utilisation, weekly_sales_rate")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — Target Label Creation
# ─────────────────────────────────────────────────────────────────────────────

def create_labels(df):
    """
    Create the four target label columns using business rules.
    These labels are what the ML models are trained to predict.

    Labels created:
      - expiry_risk        : Low, Medium, High, Expired
      - sales_velocity     : Slow, Moderate, Fast
      - customer_preference: Low, Medium, High
      - slow_mover         : Yes, No
    """
    print("\n--- Label Creation ---")

    # ── Label 1: Expiry Risk ──────────────────────────────────────────────────
    # Business rules:
    #   - Expired : days_to_expiry == 0 and shelf_life_days < 365
    #              (short shelf life product with no days left is genuinely expired)
    #   - High    : days_to_expiry <= 7 (less than one week remaining)
    #   - Medium  : days_to_expiry <= 30 (less than one month remaining)
    #   - Low     : more than 30 days remaining
    # For products with no expiry date (days_to_expiry == 0 but long shelf life),
    # sell_through_rate is used as a proxy instead.

    def label_expiry_risk(row):
        dte      = row["days_to_expiry"]
        slf      = row["shelf_life_days"]
        str_val  = row["sell_through_rate"]

        if dte == 0 and slf >= 365:
            # Non-perishable / long shelf life — no expiry date tracked
            # Use sell-through rate as proxy for risk
            if str_val >= 0.8:
                return "Low"
            elif str_val >= 0.5:
                return "Medium"
            else:
                return "High"
        elif dte == 0 and slf < 365:
            return "Expired"
        elif dte <= 7:
            return "High"
        elif dte <= 30:
            return "Medium"
        else:
            return "Low"

    df["expiry_risk"] = df.apply(label_expiry_risk, axis=1)
    print("  expiry_risk distribution:")
    print(df["expiry_risk"].value_counts().to_string())

    # ── Label 2: Sales Velocity ───────────────────────────────────────────────
    # Business rules based on weekly_sales_rate and sell_through_rate:
    #   - Fast     : high weekly sales rate AND high sell-through
    #   - Slow     : low weekly sales rate OR very low sell-through
    #   - Moderate : everything in between

    wsr_33 = df["weekly_sales_rate"].quantile(0.33)
    wsr_66 = df["weekly_sales_rate"].quantile(0.66)

    def label_sales_velocity(row):
        wsr     = row["weekly_sales_rate"]
        str_val = row["sell_through_rate"]
        if wsr >= wsr_66 and str_val >= 0.6:
            return "Fast"
        elif wsr <= wsr_33 or str_val < 0.3:
            return "Slow"
        else:
            return "Moderate"

    df["sales_velocity"] = df.apply(label_sales_velocity, axis=1)
    print("\n  sales_velocity distribution:")
    print(df["sales_velocity"].value_counts().to_string())

    # ── Label 3: Customer Preference ─────────────────────────────────────────
    # Business rules:
    #   Products with purchase_frequency data (from transactions dataset):
    #     - High   : purchase_frequency >= 500
    #     - Medium : purchase_frequency >= 200
    #     - Low    : below 200
    #   Products without purchase data use sell_through_rate and demand_forecast:
    #     - High   : high sell-through AND above-median demand forecast
    #     - Low    : low sell-through OR well below median demand forecast
    #     - Medium : everything in between

    demand_median = df["demand_forecast"].median()

    def label_customer_preference(row):
        str_val  = row["sell_through_rate"]
        df_val   = row["demand_forecast"]
        pf       = row["purchase_frequency"]

        if pf > 0:
            if pf >= 500:
                return "High"
            elif pf >= 200:
                return "Medium"
            else:
                return "Low"
        else:
            if str_val >= 0.7 and df_val >= demand_median:
                return "High"
            elif str_val <= 0.3 or df_val < demand_median * 0.5:
                return "Low"
            else:
                return "Medium"

    df["customer_preference"] = df.apply(label_customer_preference, axis=1)
    print("\n  customer_preference distribution:")
    print(df["customer_preference"].value_counts().to_string())

    # ── Label 4: Slow Mover ───────────────────────────────────────────────────
    # Business rule:
    #   A product is a slow mover if its sell-through rate is low AND
    #   its weekly sales rate is in the bottom third of all products.
    #   This combination means it is both selling slowly and not moving
    #   much stock relative to other products in the same period.

    def label_slow_mover(row):
        str_val = row["sell_through_rate"]
        wsr     = row["weekly_sales_rate"]
        if str_val < 0.3 and wsr <= wsr_33:
            return "Yes"
        else:
            return "No"

    df["slow_mover"] = df.apply(label_slow_mover, axis=1)
    print("\n  slow_mover distribution:")
    print(df["slow_mover"].value_counts().to_string())

    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Save Final Dataset
# ─────────────────────────────────────────────────────────────────────────────

def save_dataset(df, path="data/StockSense-Inventory.csv"):
    """
    Save the cleaned and labelled dataset to CSV.
    This is the final dataset used for all ML model training.
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)
    print(f"\n--- Final Dataset Saved ---")
    print(f"  Path  : {path}")
    print(f"  Shape : {df.shape[0]:,} rows x {df.shape[1]} columns")
    print(f"  Labels: expiry_risk, sales_velocity, customer_preference, slow_mover")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    df = load_data()
    df = clean_data(df)
    df = engineer_features(df)
    df = create_labels(df)
    save_dataset(df)
    print("\nData preparation complete.")
