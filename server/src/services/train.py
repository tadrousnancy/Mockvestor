import lightgbm as lgb
import pandas as pd
import numpy as np
import joblib
from daily_fetch import engine
from sklearn.metrics import mean_squared_error, r2_score
from features import Features

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
# drop weekends
df = df[df["trading_date"].dt.dayofweek < 5]

# ---------- Feature Engineering ---------- #

print("-------------------------------------------------")
print("Engineering features...")
print("-------------------------------------------------")

feat = Features()
df = feat.calculate_features(df)
g = df.groupby("ticker")

# ---------- Target Variables ---------- #

print("Calculating target variables...")
print("-------------------------------------------------")


# calculate the expected volatility for the next 1, 5, and 21 days
# Garman-Klass Volatility is used for higher efficiency
def garman_klass(high, low, close, open_):
    return np.sqrt(
        0.5 * (np.log(high / low) ** 2) -
        (2 * np.log(2) - 1) * (np.log(close / open_) ** 2)
    )


next_high = g["high_price"].transform(lambda x: x.shift(-1))
next_low = g["low_price"].transform(lambda x: x.shift(-1))
next_close = g["close_price"].transform(lambda x: x.shift(-1))
next_open = g["open_price"].transform(lambda x: x.shift(-1))

# 1 day in the future
df["target_1d"] = garman_klass(next_high, next_low, next_close, next_open)

# N days in the future
df["gk_daily"] = garman_klass(df["high_price"], df["low_price"], df["close_price"], df["open_price"])
df["target_5d"] = g["gk_daily"].shift(-1).rolling(5).mean()
df["target_21d"] = g["gk_daily"].shift(-1).rolling(21).mean()

# ---------- Order Features ---------- #
print("Shifting features and dropping undefined rows...")
print("-------------------------------------------------")

features = feat.order_features(df)[1]

print("Before dropping:")
print(f"Total rows: {len(df)}")
print(f"Date range: {df["trading_date"].min()} to {df["trading_date"].max()}\n")

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
    X_test = None
    Y_test = None

    cutoff = start + pd.Timedelta(days=min_train)
    while cutoff <= end:
        test_end = min(cutoff + pd.Timedelta(days=test_window), end)

        # skip if test set is too small
        if (test_end - cutoff).days < 30:
            break

        train = df_[(df_["trading_date"] < cutoff)].copy()
        test = df_[(df_["trading_date"] >= cutoff) & (df_["trading_date"] < test_end)].copy()

        # weigh recent market data more than older data
        decay = 60
        days_from_end = (train["trading_date"].max() - train["trading_date"]).dt.days
        train["weight"] = np.exp(-days_from_end / decay)

        X_train, Y_train = train[features_], train[target_]
        X_test, Y_test = test[features_], test[target_]

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
    return model, X_test, Y_test


# train all three
model_1d, X_test_1d, Y_test_1d = walk_forward(df, features, "target_1d", "1d")
model_5d, X_test_5d, Y_test_5d = walk_forward(df, features, "target_5d", "5d")
model_21d, X_test_21d, Y_test_21d = walk_forward(df, features, "target_21d", "21d")


def dump_model(model, X_test, Y_test, days):
    # save model only if the accuracy improved
    new_score = model.score(X_test, Y_test)
    try:
        with open(f"../models/{days}d_score.txt", 'r+') as file:
            old_score = float(file.read().strip())
            if new_score > old_score:
                joblib.dump(model, f"../models/LGBM_{days}d.joblib")
                file.write(str(new_score))
    except (FileNotFoundError, ValueError):
        joblib.dump(model, f"../models/LGBM_{days}d.joblib")
        with open(f"../models/{days}d_score.txt", 'w') as file:
            file.write(str(new_score))


# save models
dump_model(model_1d, X_test_1d, Y_test_1d, 1)
dump_model(model_5d, X_test_5d, Y_test_5d, 5)
dump_model(model_21d, X_test_21d, Y_test_21d, 21)

# ---------- Feature Debugging ---------- #
# import matplotlib.pyplot as plt
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
