import lightgbm as lgb
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
from daily_fetch import engine
from sklearn.metrics import mean_squared_error, r2_score

# ---------- Fetching Market Data ---------- #

query = """
    SELECT ticker, trading_date, open_price, high_price, low_price, close_price, volume, vwap
    FROM daily_market_summaries
    WHERE close_price IS NOT NULL AND trading_date >= '2020-06-01'
    ORDER BY ticker, trading_date
"""
df = pd.read_sql(query, engine)
cols = ["open_price", "high_price", "low_price", "close_price", "volume", "vwap"]
df[cols] = df[cols].astype(float)
df["trading_date"] = pd.to_datetime(df["trading_date"])
df = df.sort_values(["ticker", "trading_date"])

# SPY and VIX
spy_df = (
    df[df["ticker"] == "SPY"][["trading_date", "close_price"]]
    .rename(columns={"close_price": "spy_close"})
)
vix_df = (
    df[df["ticker"] == "VIX"][["trading_date", "close_price"]]
    .rename(columns={"close_price": "vix_close"})
)
df = df.merge(spy_df, on="trading_date", how="left")
df = df.merge(vix_df, on="trading_date", how="left")
spy = df["spy_close"]
vix = df["vix_close"]

g = df.groupby("ticker")

# OHLCV declarations
open_ = df["open_price"]
close = df["close_price"]
high = df["high_price"]
low = df["low_price"]
volume = df["volume"]
vwap = df["vwap"]

# ---------- Feature Engineering ---------- #

print("-------------------------------------------------")
print("Engineering features...")
print("-------------------------------------------------")

epsilon = 1e-9  # used to prevent zero division errors

# Returns over N days
df["return_1d"] = g["close_price"].transform(lambda x: x.pct_change(1))
df["return_5d"] = g["close_price"].transform(lambda x: x.pct_change(5))
df["return_30d"] = g["close_price"].transform(lambda x: x.pct_change(30))

# Volatility
return_1d = g["return_1d"]
df["volatility_10d"] = return_1d.transform(lambda x: x.rolling(10).std())
df["volatility_30d"] = return_1d.transform(lambda x: x.rolling(30).std())
df["volatility_60d"] = return_1d.transform(lambda x: x.rolling(60).std())
df["volatility_ratio"] = df["volatility_10d"] / (df["volatility_60d"] + epsilon)

# Intraday Range
df["hl_spread"] = (high - low) / close
df["hl_pct"] = (high - low) / open_

# Average True Range
df["prev_close"] = g["close_price"].transform(lambda x: x.shift(1))
tr = pd.concat([
    high - low,
    (high - df["prev_close"]).abs(),
    (low - df["prev_close"]).abs()
], axis=1).max(axis=1)
df["tr"] = tr
df["atr"] = g["tr"].transform(lambda x: x.rolling(14).mean())
df.drop(columns=["prev_close", "tr"], inplace=True)

# Parkinson Volatility
df["log_hl"] = np.log(high / low) ** 2
df["park_10d"] = g["log_hl"].transform(lambda x: np.sqrt((1 / (4 * np.log(2))) * x.rolling(10).mean()))
df.drop(columns=["log_hl"], inplace=True)

# Volume Ratio (20 days)
df["volume_ratio"] = g["volume"].transform(lambda x: x / x.rolling(20).mean())

# RSI
df["delta"] = g["close_price"].transform(lambda x: x.diff())
df["rsi"] = g["delta"].transform(lambda x: (
        100 - 100 / (1 + x.clip(lower=0).rolling(14).mean() / ((-x.clip(upper=0)).rolling(14).mean() + epsilon))
))
df.drop(columns=["delta"], inplace=True)

# VWAP Deviation
df["vwap_dev"] = (close - vwap) / vwap

# Distance from 52-week high
df["dist_from_52w_high"] = g["close_price"].transform(
    lambda x: (x - x.rolling(252).max()) /
    (x.rolling(252).max() + epsilon)
)

# Overnight Gap
prev_close = g["close_price"].transform(lambda x: x.shift(1))
df["gap"] = (open_ - prev_close) / (prev_close + epsilon)

# Candle Shadow Ratios
candle_high = pd.concat([open_, close], axis=1).max(axis=1)
candle_low = pd.concat([open_, close], axis=1).min(axis=1)
candle_range = high - low
df["upper_shadow"] = (high - candle_high) / (candle_range + epsilon)
df["lower_shadow"] = (candle_low - low) / (candle_range + epsilon)

# VIX
df["vix_level"] = vix
df["vix_ratio"] = vix / vix.rolling(20).mean()
df["vol_vs_vix"] = df["volatility_10d"] / (df["vix_level"] / 100 + epsilon)

# SPY Return (1 day)
df["spy_return_1d"] = spy.pct_change(1)

# Correlation to SPY
df["corr_to_spy"] = (return_1d.transform(lambda x: x.rolling(60).corr(df.loc[x.index, "spy_return_1d"])))

# Rolling Beta
df["beta"] = (
    return_1d.transform(
        lambda x: x.rolling(60).cov(df.loc[x.index, "spy_return_1d"]) /
        (df.loc[x.index, "spy_return_1d"].rolling(60).var() + epsilon)
    )
)

# Downside Deviation
df["down_dev"] = return_1d.transform(lambda x: x.clip(upper=0).rolling(30).std())

# Max Drawdown (10 days)
df["max_dd_10d"] = g["close_price"].transform(lambda x: (x - x.rolling(10).max()) / (x.rolling(10).max() + epsilon))

# ---------- Target Variables ---------- #

print("Calculating target variables...")
print("-------------------------------------------------")

# calculate the expected volatility for the next 1, 5, and 21 days
# Garman-Klass Volatility is used for tomorrow's volatility since it is the most difficult to predict

next_high = g["high_price"].transform(lambda x: x.shift(-1))
next_low = g["low_price"].transform(lambda x: x.shift(-1))
next_close = g["close_price"].transform(lambda x: x.shift(-1))
next_open = g["open_price"].transform(lambda x: x.shift(-1))

df["target_1d"] = np.sqrt(
    0.5 * (np.log(next_high / next_low) ** 2) -
    (2 * np.log(2) - 1) * (np.log(next_close / next_open) ** 2)
)
df["target_5d"] = g["return_1d"].transform(lambda x: x.shift(-1).rolling(5).std())
df["target_21d"] = g["return_1d"].transform(lambda x: x.shift(-1).rolling(21).std())

# ---------- Order Features ---------- #
print("Shifting features and dropping undefined rows...")
print("-------------------------------------------------")

ticker_features = [
    "return_1d", "return_5d", "return_30d",
    "volatility_10d", "volatility_30d", "volatility_60d", "volatility_ratio",
    "hl_spread", "hl_pct",
    "atr", "park_10d",
    "volume_ratio", "rsi",
    "vwap_dev", "dist_from_52w_high",
    "gap", "upper_shadow", "lower_shadow",
    "vol_vs_vix", "corr_to_spy",
    "beta", "down_dev", "max_dd_10d"
]
market_features = ["vix_level", "vix_ratio", "spy_return_1d"]
df[ticker_features] = g[ticker_features].transform(lambda x: x.shift(1))
df[market_features] = df[market_features].shift(1)
features = ticker_features + market_features

print("Before dropping:")
print(f"Total rows: {len(df)}")
print(f"Date range: {df["trading_date"].min()} to {df["trading_date"].max()}")
print()

targets = ["target_1d", "target_5d", "target_21d"]
df = df.dropna(subset=features + targets)

print("After dropping:")
print(f"Total rows: {len(df)}")
print(f"Date range: {df['trading_date'].min()} to {df['trading_date'].max()}")
print("-------------------------------------------------")

# ---------- Testing and Evaluation ---------- #
print("Training model...")
print("-------------------------------------------------")


# use walk-forward validation to test different intervals of data
def walk_forward(df_, features_, target_, label_):
    print(f"Predicting volatility after {label_}...")

    test_window = 365  # days
    min_train = 365  # at least 365 days
    results = []
    start = df_["trading_date"].min()
    end = df_["trading_date"].max()

    cutoff = start + pd.Timedelta(days=min_train)
    while cutoff <= end:
        test_end = min(cutoff + pd.Timedelta(days=test_window), end)

        # skip if test set is too small
        if (test_end - cutoff).days < 30:
            break

        train = df_[(df_["trading_date"] < cutoff)].copy()
        test = df_[(df_["trading_date"] >= cutoff) & (df_["trading_date"] < test_end)].copy()

        # weigh recent market data more than older data
        days_from_end = (train["trading_date"].max() - train["trading_date"]).dt.days
        train["weight"] = np.exp(-days_from_end / 365)

        X_train, Y_train = train[features_], train[target_]
        X_test, Y_test = test[features_], test[target_]

        model = lgb.LGBMRegressor(
            n_estimators=5000,
            learning_rate=0.05,
            num_leaves=31,
            max_depth=6,
            min_child_samples=50,
            feature_fraction=0.8,
            bagging_fraction=0.8,
            bagging_freq=5,
            reg_alpha=0.1,
            reg_lambda=0.1,
            verbose=-1
        )

        model.fit(
            X_train, Y_train,
            eval_set=[(X_test, Y_test)],
            callbacks=[lgb.early_stopping(100)],
            sample_weight=train["weight"]
        )

        train_preds = model.predict(X_train)
        test_preds = model.predict(X_test)

        results.append({
            "train_start": start,
            "train_end": cutoff,
            "test_start": cutoff,
            "test_end": test_end,
            "train_r2": r2_score(Y_train, train_preds),
            "test_r2": r2_score(Y_test, test_preds),
            "rmse": np.sqrt(mean_squared_error(Y_test, test_preds))
        })

        cutoff = test_end

    results_df = pd.DataFrame(results)
    print(results_df)
    print("-------------------------------------------------")
    return results_df, model


# train all three
results_1d, model_1d = walk_forward(df, features, "target_1d", "1d")
results_5d, model_5d = walk_forward(df, features, "target_5d", "5d")
results_21d, model_21d = walk_forward(df, features, "target_21d", "21d")

# save model
joblib.dump(model_1d, "../models/LGBM_1d.pk1")
joblib.dump(model_5d, "../models/LGBM_5d.pk1")
joblib.dump(model_21d, "../models/LGBM_21d.pk1")

# feature debugging
# fig, axes = plt.subplots(1, 3, figsize=(24, 8))
# for ax, model, label in zip(axes, [model_1d, model_5d, model_21d], ["1d", "5d", "21d"]):
#     lgb.plot_importance(model, ax=ax, title=f"Feature Importance — {label}")
# plt.tight_layout()
# plt.show()
#
# fig, axes = plt.subplots(1, 3, figsize=(24, 5))
# for ax, target, label in zip(axes, targets, ["1d", "5d", "21d"]):
#     df.groupby(df["trading_date"].dt.to_period("M"))[target].mean().plot(
#         ax=ax, title=f"Avg Target Volatility — {label}"
#     )
# plt.tight_layout()
# plt.show()
