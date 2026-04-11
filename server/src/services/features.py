import pandas as pd
import numpy as np


class Features:
    def __init__(self):
        self.ticker_features = []
        self.market_features = []

    def calculate_features(self, df):
        """
        Feature engineering: calculates the required features that LightGBM is trained on

        :param df: dataframe with historical market data
        :return df: returns the same dataframe after adding new columns to it
        """

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

        epsilon = 1e-9  # used to prevent zero division errors

        # Returns over N days
        df["return_1d"] = g["close_price"].transform(lambda x: x.pct_change(1))
        df["return_5d"] = g["close_price"].transform(lambda x: x.pct_change(5))
        df["return_21d"] = g["close_price"].transform(lambda x: x.pct_change(21))

        # Volatility
        return_1d = g["return_1d"]
        df["volatility_10d"] = return_1d.transform(lambda x: x.rolling(10).std())
        df["volatility_21d"] = return_1d.transform(lambda x: x.rolling(21).std())
        df["volatility_42d"] = return_1d.transform(lambda x: x.rolling(42).std())
        df["volatility_ratio"] = df["volatility_10d"] / (df["volatility_42d"] + epsilon)

        # Intra-day Range
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
        df["max_dd_10d"] = g["close_price"].transform(
            lambda x: (x - x.rolling(10).max()) / (x.rolling(10).max() + epsilon))

        # define features
        self.ticker_features = [
            "return_1d", "return_5d", "return_21d",
            "volatility_10d", "volatility_21d", "volatility_42d", "volatility_ratio",
            "hl_spread", "hl_pct",
            "atr", "park_10d",
            "volume_ratio", "rsi",
            "vwap_dev", "dist_from_52w_high",
            "gap", "upper_shadow", "lower_shadow",
            "vol_vs_vix", "corr_to_spy",
            "beta", "down_dev", "max_dd_10d"
        ]
        self.market_features = ["vix_level", "vix_ratio", "spy_return_1d"]

        return df

    def order_features(self, df):
        g = df.groupby("ticker")
        df[self.ticker_features] = g[self.ticker_features].transform(lambda x: x.shift(1))
        df[self.market_features] = df[self.market_features].shift(1)
        features = self.ticker_features + self.market_features
        return df, features
